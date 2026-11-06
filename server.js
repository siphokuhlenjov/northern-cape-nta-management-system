
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");

const fs = require("fs");

const crypto = require("crypto");

const helmet = require("helmet");

const morgan = require("morgan");

const session = require("express-session");

const PgSession = require("connect-pg-simple")(session);

const { Pool } = require("pg");

const bcrypt = require("bcryptjs");

const multer = require("multer");

const { validateRegistration, passwordProblems } = require("./lib/validation");

const { PrismaClient } = require("@prisma/client");
const { emailConfigured, sendPasswordResetEmail } = require("./lib/email");

const app = express();

const prisma = new PrismaClient();

const PORT = Number(process.env.PORT || 3000);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const uploadRoot = path.join(__dirname, "private_uploads");

fs.mkdirSync(uploadRoot, { recursive: true });

app.disable("x-powered-by");

app.use(helmet({ contentSecurityPolicy: false }));

app.use(morgan("dev"));

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use(session({ name: "nta.sid", store: new PgSession({ pool, tableName: "nta_sessions", createTableIfMissing: true }), secret: process.env.SESSION_SECRET || "development-only-change-this-session-secret-before-deployment", resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 } }));

app.use(express.static(path.join(__dirname, "public")));

const ROLES = { teacher: "TEACHER", district: "DISTRICT_ADMIN", provincial: "PROVINCIAL_OFFICIAL", admin: "SYSTEM_ADMIN" };

const upload = multer({ storage: multer.diskStorage({ destination: (_req,_file,cb)=>cb(null,uploadRoot), filename: (_req,file,cb)=>cb(null,crypto.randomUUID()+path.extname(file.originalname).toLowerCase()) }), limits: { fileSize: (Number(process.env.UPLOAD_MAX_MB)||10)*1024*1024, files:17 }, fileFilter: (_req,file,cb)=>{ const allowed=["application/pdf","image/jpeg","image/png"]; cb(allowed.includes(file.mimetype)?null:new Error("Only PDF, JPG and PNG files are accepted."),allowed.includes(file.mimetype)); } });

const safeUser = u => ({ id:u.id,email:u.email,role:u.role,teacher:u.teacher?{id:u.teacher.id,firstName:u.teacher.firstName,surname:u.teacher.surname,saceNumber:u.teacher.saceNumber,districtId:u.teacher.applications?.[0]?.districtId||null}:null });

async function auth(req, res, next) {

  try {

    // Check whether the user has an active session

    if (!req.session?.userId) {

      return res.status(401).json({

        error: "Please sign in to continue."

      });

    }



    // Retrieve the logged-in user from PostgreSQL

    const user = await prisma.user.findUnique({

      where: {

        id: req.session.userId

      }

    });



    // Make sure the account exists and is active

    if (!user || !user.active) {

      return res.status(401).json({

        error: "Your account is unavailable. Please sign in again."

      });

    }



    // Make user details available to protected routes

    req.user = user;



    next();



  } catch (e) {

    console.error("NTA AUTH ERROR:", e);

    next(e);

  }

}

function allow(...roles) {
  return [auth, (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({error:"Your role does not have permission for this action."});
    }
    next();
  }];
}

function uploadRegistrationDocument(req, res, next) {
  upload.fields([
    {name:"registrationDocument",maxCount:1},
    {name:"idDocument",maxCount:1},
    {name:"evidenceDocuments",maxCount:10},
    {name:"motivationalLetters",maxCount:5}
  ])(req, res, error => {
    if (!error) return next();
    for(const files of Object.values(req.files||[])){
      for(const file of files)if(fs.existsSync(file.path))fs.unlinkSync(file.path);
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({error:error.code==="LIMIT_FILE_SIZE"?`File exceeds ${process.env.UPLOAD_MAX_MB||10} MB limit.`:"Upload failed."});
    }
    return res.status(400).json({error:error.message});
  });
}

async function audit(req,action,entityType,entityId,details={},actorId){try{await prisma.auditLog.create({data:{userId:actorId||req.session?.userId||null,action,entityType,entityId:entityId||null,details,ipAddress:req.ip,userAgent:req.get("user-agent")||"unknown"}})}catch(e){console.error("Audit write failed",e.message)}}

async function notify(userId,title,message){if(!userId)return;try{await prisma.notification.create({data:{userId,title,message}})}catch(e){console.error("Notification failed",e.message)}}

function dbProblem(e){const code=e&&e.code,name=e&&e.name||"";if(["P1000","P1001","P1002","P1003","P1017"].includes(code)||name==="PrismaClientInitializationError")return"The database is not reachable. Check DATABASE_URL in .env and that PostgreSQL is running (open /api/health to test).";if(["P2021","P2022"].includes(code))return"The database tables are missing or out of date. Stop the server and run: npx prisma db push";return null}
function fail(res,e,publicMessage="Request could not be completed."){console.error("NTA BACKEND ERROR:",e);const hint=process.env.NODE_ENV==="production"?null:dbProblem(e);if(hint)return res.status(503).json({error:hint});return res.status(500).json({error:publicMessage})}
const rateBuckets=new Map();
function rateLimit(name,max,windowMs){return(req,res,next)=>{const key=name+":"+(req.ip||"unknown"),now=Date.now();let b=rateBuckets.get(key);if(!b||now-b.start>windowMs){b={count:0,start:now};rateBuckets.set(key,b)}b.count++;if(rateBuckets.size>5000)rateBuckets.clear();if(b.count>max){res.set("Retry-After",String(Math.ceil((b.start+windowMs-now)/1000)));return res.status(429).json({error:"Too many attempts. Please wait a few minutes and try again."})}next()}}

app.get("/api/health",async(_req,res)=>{try{await prisma.$queryRaw`SELECT 1`;res.json({status:"ok",database:"connected"})}catch(e){console.error("NTA HEALTH CHECK FAILED:",e);res.status(503).json({status:"error",database:"unavailable"})}});

// Public, minimal cycle data powers the homepage countdown without exposing internal notes.

app.get("/api/public/cycles",async(_req,res)=>{try{const data=await prisma.awardCycle.findMany({where:{status:{in:["OPEN","PUBLISHED","CONFIGURED","CLOSED"]}},select:{id:true,name:true,year:true,status:true,opensAt:true,closesAt:true,guideUrl:true},orderBy:{year:"desc"},take:10});res.set("Cache-Control","no-store");res.json({data})}catch(e){fail(res,e,"Could not load award dates.")}});



// Support assistant is limited to navigation and upload troubleshooting, not eligibility or policy decisions.

const supportHits=new Map();

app.post("/api/support/chat",async(req,res)=>{

  const ip=req.ip||"unknown",now=Date.now(),entry=supportHits.get(ip)||{count:0,start:now};

  if(now-entry.start>60_000){entry.count=0;entry.start=now;}

  entry.count++;supportHits.set(ip,entry);if(entry.count>20)return res.status(429).json({error:"Please wait a minute before sending more messages."});

  const message=String(req.body?.message||"").trim().slice(0,1200);if(!message)return res.status(400).json({error:"Type a question first."});

  const fallback=()=>{const q=message.toLowerCase();if(/upload|document|pdf|jpg|png|file/.test(q))return "For document uploads: sign in, open My Applications, select a draft or returned application, choose the document type, select a PDF/JPG/PNG file up to 10 MB, and select Upload. If it fails, check the file size/type and try again. This helper cannot verify whether a document meets award rules.";if(/login|sign in|password|account/.test(q))return "For sign-in help, use the email linked to your account. Check that Caps Lock is off. Staff accounts are created by an authorised system administrator; teacher accounts can be created using Teacher registration. This helper cannot reset passwords.";if(/draft|application|submit|status/.test(q))return "To manage an application, sign in and open My Applications. Create a draft, complete the available fields, upload supporting files, and submit while the relevant award cycle is open. You can view the status in your application list. For eligibility or official rules, consult the published NTA nomination guide or contact your district office.";if(/cycle|closing|deadline|countdown|date/.test(q))return "Award dates are shown in the countdown on the homepage when an award cycle has opening or closing dates configured. If no dates appear, ask an authorised provincial official or system administrator to configure the current cycle.";return "I can help with navigating the website, signing in, application drafts, and upload troubleshooting. I cannot decide eligibility, interpret award policy, or replace official guidance. What part of the website are you trying to use?";};

  if(!process.env.OPENAI_API_KEY){return res.json({reply:fallback(),mode:"guided-help"});}

  try{const response=await fetch(process.env.OPENAI_API_URL||"https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4o-mini",temperature:0.2,max_tokens:300,messages:[{role:"system",content:"You are the Northern Cape NTA website support assistant. Only help with website navigation, account sign-in basics, application drafts, and troubleshooting document uploads. Do not answer eligibility, scoring, award policy, or deadline questions; direct users to the current official nomination guide or their district/provincial office. Never request passwords, ID numbers, SACE numbers, or private application documents. Do not claim to perform account changes."},{role:"user",content:message}]})});if(!response.ok)throw new Error(`AI provider returned ${response.status}`);const data=await response.json();const reply=data.choices?.[0]?.message?.content?.trim();if(!reply)throw new Error("Empty AI response");res.json({reply,mode:"ai"});}catch(e){console.error("Support assistant provider error:",e.message);res.json({reply:fallback(),mode:"guided-help",notice:"AI service is temporarily unavailable; showing guided help instead."});}

});

app.get("/api/auth/me",auth,async(req,res)=>{try{const u=await prisma.user.findUnique({where:{id:req.session.userId},include:{teacher:{include:{applications:{select:{districtId:true},take:1}}}}});if(!u||!u.active){req.session.destroy(()=>{});return res.status(401).json({error:"Session expired"})}res.json({user:safeUser(u)})}catch(e){fail(res,e)}});

app.post("/api/auth/register",rateLimit("register",30,60*60*1000),uploadRegistrationDocument,async(req,res)=>{
  const uploadedFiles=Object.values(req.files||{}).flat();
  let keepUploadedFiles=false;
  const removeUploadedFile=()=>{
    if(!keepUploadedFiles)for(const file of uploadedFiles)if(fs.existsSync(file.path))fs.unlinkSync(file.path);
  };
  try{
    const certificate=req.files?.registrationDocument?.[0];
    if(!certificate)return res.status(400).json({error:"Upload your SACE certificate to complete registration.",errors:{registrationDocument:"A SACE certificate is required."}});
    const result=validateRegistration(req.body||{});
    if(!result.ok){
      removeUploadedFile();
      return res.status(400).json({error:"Please correct the highlighted fields.",errors:result.errors});
    }
    const v=result.values;
    const [emailTaken,saceTaken]=await Promise.all([
      prisma.user.findUnique({where:{email:v.email}}),
      prisma.teacher.findUnique({where:{saceNumber:v.saceNumber}})
    ]);
    if(emailTaken||saceTaken){
      removeUploadedFile();
      const errors={};
      if(emailTaken)errors.email="An account with this email already exists. Try signing in instead.";
      if(saceTaken)errors.saceNumber="This SACE number is already registered to an account.";
      return res.status(409).json({error:emailTaken?errors.email:errors.saceNumber,errors});
    }
    const passwordHash=await bcrypt.hash(v.password,12);
    const registrationDocuments=Object.entries({
      registrationDocument:"SACE_CERTIFICATE",
      idDocument:"IDENTITY_DOCUMENT",
      evidenceDocuments:"SUPPORTING_EVIDENCE",
      motivationalLetters:"MOTIVATIONAL_LETTER"
    }).flatMap(([field,type])=>(req.files?.[field]||[]).map(file=>({
      type,
      fileName:path.basename(file.originalname).slice(0,255),
      storagePath:file.filename,
      mimeType:file.mimetype,
      fileSize:file.size,
      sha256:crypto.createHash("sha256").update(fs.readFileSync(file.path)).digest("hex")
    })));
    const user=await prisma.user.create({
      data:{
        email:v.email,
        passwordHash,
        role:"TEACHER",
        teacher:{create:{
          title:v.title||null,
          firstName:v.firstName,
          surname:v.surname,
          saceNumber:v.saceNumber,
          citizenship:v.citizenship,
          yearsTeaching:v.yearsTeaching,
          yearsAtCurrentSchool:v.yearsAtCurrentSchool,
          phone:v.phone,
          registrationDocuments:{create:registrationDocuments}
        }}
      },
      include:{teacher:true}
    });
    keepUploadedFiles=true;
    req.session.regenerate(async err=>{
      if(err)return fail(res,err);
      req.session.userId=user.id;
      await audit(req,"ACCOUNT_REGISTERED","User",user.id,{role:user.role,consentAccepted:true,registrationDocumentsUploaded:registrationDocuments.map(d=>d.type)});
      await notify(user.id,"Welcome to the Northern Cape NTA portal","Your teacher account and registration documents are ready. Create a draft application when an award cycle is open and upload any additional application evidence.");
      req.session.save(e2=>{
        if(e2)return fail(res,e2);
        res.status(201).json({user:safeUser(user),message:"Account created with your uploaded registration documents. Officials will verify your details and documents during review."});
      });
    });
  }catch(e){
    removeUploadedFile();
    if(e.code==="P2002"){
      const t=String(e.meta?.target||"");
      const errors=t.includes("sace")?{saceNumber:"This SACE number is already registered to an account."}:{email:"An account with this email already exists."};
      return res.status(409).json({error:Object.values(errors)[0],errors});
    }
    fail(res,e);
  }
});

app.post("/api/auth/login", rateLimit("login", 40, 15 * 60 * 1000), async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !password) {
      return res.status(400).json({ error: "Enter a valid email address and password." });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teacher: {
          include: {
            applications: {
              select: { districtId: true },
              take: 1
            }
          }
        }
      }
    });

    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      await audit(req, "LOGIN_FAILED", "User", user?.id || null);
      return res.status(401).json({
        error: "Email or password is incorrect."
      });
    }

    req.session.regenerate((err) => {
      if (err) {
        return fail(res, err);
      }

      req.session.userId = user.id;

      req.session.save(async (saveError) => {
        if (saveError) {
          return fail(res, saveError);
        }

        await audit(req, "LOGIN_SUCCEEDED", "User", user.id, {
          role: user.role
        });

        return res.json({
          user: safeUser(user)
        });
      });
    });
  } catch (e) {
    fail(res, e);
  }
});
const RESET_TTL_MS=30*60*1000;
const hashToken=t=>crypto.createHash("sha256").update(String(t)).digest("hex");
app.post("/api/auth/forgot-password",rateLimit("forgot",10,15*60*1000),async(req,res)=>{
  const generic="If an account exists for that email, a password reset link will be sent.";
  try{
    const email=String(req.body?.email||"").trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return res.status(400).json({error:"Enter a valid email address."});
    const hasEmail= emailConfigured();
    if(!hasEmail&&process.env.NODE_ENV==="production")return res.status(503).json({error:"Password reset email is not configured. Contact the system administrator."});
    const u=await prisma.user.findUnique({where:{email}});
    let devResetLink;
    if(u&&u.active){
      const token=crypto.randomBytes(32).toString("hex"),tokenHash=hashToken(token);
      await prisma.passwordResetToken.deleteMany({where:{userId:u.id,usedAt:null}});
      await prisma.passwordResetToken.create({data:{userId:u.id,tokenHash,expiresAt:new Date(Date.now()+RESET_TTL_MS)}});
      let base;
      try{
        if(process.env.NODE_ENV==="production"&&!process.env.APP_URL)throw new Error("APP_URL must be configured for password-reset links in production.");
        const configuredBase=process.env.APP_URL||`${req.protocol}://${req.get("host")}`;
        const parsedBase=new URL(configuredBase);
        if(!["https:","http:"].includes(parsedBase.protocol)||parsedBase.username||parsedBase.password)throw new Error("APP_URL must be an absolute HTTP(S) URL.");
        if(process.env.NODE_ENV==="production"&&parsedBase.protocol!=="https:")throw new Error("APP_URL must use HTTPS in production.");
        base=parsedBase.origin;
      }catch(error){
        await prisma.passwordResetToken.deleteMany({where:{tokenHash}});
        throw error;
      }
      const link=`${base}/reset-password.html?token=${token}`;
      await audit(req,"PASSWORD_RESET_REQUESTED","User",u.id,{},u.id);
      if(hasEmail){
        try{
          await sendPasswordResetEmail({to:email,link});
        }catch(error){
          await prisma.passwordResetToken.deleteMany({where:{tokenHash}});
          console.error("PASSWORD RESET EMAIL DELIVERY FAILED:",error.message);
          return res.status(503).json({error:"The reset email could not be sent right now. Please try again later or contact support."});
        }
      }else if(process.env.NODE_ENV!=="production"&&process.env.RESET_LINK_IN_RESPONSE!=="false"){
        devResetLink=link;
      }
    }
    res.json({message:generic,...(devResetLink?{devResetLink}:{})});
  }catch(e){fail(res,e,"Could not start the password reset. Please try again.")}});
app.post("/api/auth/reset-password",rateLimit("reset",20,15*60*1000),async(req,res)=>{try{const token=String(req.body?.token||"");const password=typeof req.body?.password==="string"?req.body.password:"";if(!/^[a-f0-9]{64}$/.test(token))return res.status(400).json({error:"This reset link is invalid. Request a new one."});const rec=await prisma.passwordResetToken.findUnique({where:{tokenHash:hashToken(token)},include:{user:true}});if(!rec||rec.usedAt||rec.expiresAt<new Date()||!rec.user.active)return res.status(400).json({error:"This reset link is invalid or has expired. Request a new one."});const problems=passwordProblems(password,rec.user.email);if(problems.length)return res.status(400).json({error:"Password needs: "+problems.join(", ")+".",errors:{password:"Password needs: "+problems.join(", ")+"."}});if(req.body?.confirmPassword!==undefined&&req.body.confirmPassword!==password)return res.status(400).json({error:"The two passwords do not match.",errors:{confirmPassword:"The two passwords do not match."}});const hash=await bcrypt.hash(password,12);await prisma.$transaction([prisma.user.update({where:{id:rec.userId},data:{passwordHash:hash}}),prisma.passwordResetToken.update({where:{id:rec.id},data:{usedAt:new Date()}}),prisma.passwordResetToken.deleteMany({where:{userId:rec.userId,usedAt:null}})]);try{await pool.query("DELETE FROM nta_sessions WHERE sess->>'userId' = $1",[rec.userId])}catch(e){console.error("Could not clear old sessions:",e.message)}await audit(req,"PASSWORD_RESET_COMPLETED","User",rec.userId,{},rec.userId);await notify(rec.userId,"Password changed","Your password was changed using a reset link. If this was not you, contact an administrator immediately.");res.json({ok:true,message:"Password updated. You can now sign in."})}catch(e){fail(res,e,"Could not reset the password. Please request a new link.")}});
app.post("/api/auth/logout",auth,async(req,res)=>{await audit(req,"LOGOUT","User",req.session.userId);req.session.destroy(err=>{if(err)return fail(res,err);res.clearCookie("nta.sid");res.json({ok:true})})});

app.get("/api/reference/categories",async(_req,res)=>{try{res.json({data:await prisma.ntaCategory.findMany({where:{active:true},select:{id:true,code:true,name:true,experienceMin:true,notes:true},orderBy:{code:"asc"}})})}catch(e){fail(res,e,"Could not load categories. Check database setup.")}});

app.get("/api/reference/districts",async(_req,res)=>{try{res.json({data:await prisma.district.findMany({orderBy:{name:"asc"},select:{id:true,name:true}})})}catch(e){fail(res,e,"Could not load districts.")}});

app.get("/api/reference/schools",async(req,res)=>{try{const where=req.query.districtId?{districtId:String(req.query.districtId)}:{};res.json({data:await prisma.school.findMany({where,select:{id:true,name:true,emisNumber:true,districtId:true,schoolType:true},orderBy:{name:"asc"},take:1000})})}catch(e){fail(res,e)}});

app.get("/api/stats",auth,async(req,res)=>{try{const u=await prisma.user.findUnique({where:{id:req.session.userId}});const where=u.role==="DISTRICT_ADMIN"?{districtId:await districtForUser(u.id)}:{};const [applications,teachers,schools,categories,districts,groups]=await Promise.all([prisma.application.count({where}),prisma.teacher.count(),prisma.school.count(),prisma.ntaCategory.count({where:{active:true}}),prisma.district.count(),prisma.application.groupBy({by:["status"],where,_count:{_all:true}})]);res.json({data:{applications,teachers,schools,categories,districts,byStatus:Object.fromEntries(groups.map(x=>[x.status,x._count._all]))},source:"PostgreSQL"})}catch(e){fail(res,e)}});

async function districtForUser(userId){const u=await prisma.user.findUnique({where:{id:userId},select:{districtId:true}}).catch(()=>null);return u?.districtId||null}

async function appWhereFor(req){if(req.user.role==="TEACHER"){const t=await prisma.teacher.findUnique({where:{userId:req.user.id}});return {teacherId:t?.id||"none"}}if(req.user.role==="DISTRICT_ADMIN"){const d=await districtForUser(req.user.id);return {districtId:d||"none"}}if(["PROVINCIAL_OFFICIAL","SYSTEM_ADMIN"].includes(req.user.role))return {};throw new Error("Unsupported account role.")}

app.get("/api/applications", auth, async (req, res) => {
  try {
    const where = await appWhereFor(req);
    if (req.query.status) where.status = String(req.query.status);
    const options = {
      where,
      include: {
        category: {select:{code:true,name:true}},
        district: {select:{name:true}},
        school: {select:{name:true}},
        teacher: {select:{firstName:true,surname:true,saceNumber:true}},
        documents: {select:{id:true,type:true,fileName:true,status:true,fileSize:true,createdAt:true}},
        disputes: {select:{id:true,status:true,reason:true,submittedAt:true}},
        tasks: true
      },
      orderBy: {updatedAt:"desc"},
      take: 300
    };
    try {
      return res.json({data:await prisma.application.findMany(options)});
    } catch (richError) {
      console.error("NTA APPLICATION LIST RELATIONS ERROR:", richError);
      // Fallback: return only authorized application rows if relation loading fails.
      const rows = await prisma.application.findMany({where,orderBy:{updatedAt:"desc"},take:300});
      return res.json({data:rows,notice:"Some related application information could not be loaded."});
    }
  } catch (e) { fail(res,e); }
});

app.get("/api/applications/:id", auth, async (req, res) => {
  try {
    // First verify ownership using a minimal query.
    const base = await prisma.application.findUnique({where:{id:req.params.id}});
    if (!base) return res.status(404).json({error:"Application not found."});
    if (req.user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({where:{userId:req.user.id},select:{id:true}});
      if (base.teacherId !== teacher?.id) return res.status(403).json({error:"You can only view your own applications."});
    }
    if (req.user.role === "DISTRICT_ADMIN" && (await districtForUser(req.user.id)) !== base.districtId) {
      return res.status(403).json({error:"This application belongs to another district."});
    }
    let a;
    try {
      a = await prisma.application.findUnique({
        where:{id:req.params.id},
        include:{category:true,district:true,school:true,teacher:{include:{registrationDocuments:{select:{id:true,type:true,fileName:true,fileSize:true,createdAt:true}}}},documents:true,vetting:true,statusHistory:{orderBy:{createdAt:"desc"}},disputes:true,tasks:true}
      });
    } catch (richError) {
      console.error("NTA APPLICATION DETAIL RELATIONS ERROR:", richError);
      a = {...base};
      // Load each relation separately; one broken relation must not hide the draft.
      for (const relation of ["category","district","school","teacher","documents","vetting","statusHistory","disputes","tasks"]) {
        try {
          const include = relation === "statusHistory" ? {statusHistory:{orderBy:{createdAt:"desc"}}} : {[relation]:true};
          const result = await prisma.application.findUnique({where:{id:base.id},include});
          a[relation] = result?.[relation] ?? (["documents","statusHistory","disputes","tasks"].includes(relation)?[]:null);
        } catch (relationError) {
          console.error(`NTA APPLICATION RELATION ${relation} ERROR:`,relationError);
          a[relation] = ["documents","statusHistory","disputes","tasks"].includes(relation)?[]:null;
        }
      }
    }
    if (req.user.role === "TEACHER" && a.vetting) {
      a.vetting = {decision:a.vetting.decision,comments:null};
    }
    if(a.teacher?.registrationDocuments?.length){
      const registrationDocumentLabels={SACE_CERTIFICATE:"SACE certificate (registration)",IDENTITY_DOCUMENT:"Identity document (registration)",SUPPORTING_EVIDENCE:"Supporting evidence (registration)",MOTIVATIONAL_LETTER:"Motivational letter (registration)"};
      a.documents=[
        ...(a.documents||[]),
        ...a.teacher.registrationDocuments.map(d=>({...d,id:`registration-${d.id}`,type:registrationDocumentLabels[d.type]||"Registration document",status:"UPLOADED",registrationDocument:true}))
      ];
      delete a.teacher.registrationDocuments;
    }
    a.cycleRequirements=a.cycleId?await prisma.cycleCategoryRequirement.findMany({
      where:{cycleId:a.cycleId,categoryId:a.categoryId},
      orderBy:{createdAt:"asc"}
    }):[];
    return res.json({data:a});
  } catch (e) { fail(res,e); }
});

app.post("/api/applications",allow("TEACHER"),async(req,res)=>{try{const {categoryId,schoolId,nominationSource,declarationAccepted}=req.body||{};if(!categoryId||!schoolId||declarationAccepted!==true)return res.status(400).json({error:"Select a category and school and accept the declaration."});const [teacher,school,category,cycle]=await Promise.all([prisma.teacher.findUnique({where:{userId:req.user.id}}),prisma.school.findUnique({where:{id:String(schoolId)}}),prisma.ntaCategory.findUnique({where:{id:String(categoryId),active:true}}),prisma.awardCycle.findFirst({where:{status:"OPEN"},orderBy:{year:"desc"}})]);if(!teacher||!school||!category)return res.status(400).json({error:"Select a valid school and active award category."});if(!cycle)return res.status(400).json({error:"There is no open award cycle. Contact your district or provincial administrator."});const now=new Date();if(cycle.opensAt&&now<cycle.opensAt||cycle.closesAt&&now>cycle.closesAt)return res.status(400).json({error:"The application period is not currently open."});const existing=await prisma.application.findFirst({where:{teacherId:teacher.id,categoryId,cycleId:cycle.id,status:{not:"DRAFT"}}});if(existing)return res.status(409).json({error:"You already have a submitted application for this category and cycle."});const number=`NCNTA-${cycle.year}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;const data=await prisma.application.create({data:{applicationNumber:number,teacherId:teacher.id,categoryId,districtId:school.districtId,schoolId,nominationSource:nominationSource?String(nominationSource):null,declarationAccepted:true,status:"DRAFT",cycleId:cycle.id,profileSnapshot:{firstName:teacher.firstName,surname:teacher.surname,saceNumber:teacher.saceNumber,citizenship:teacher.citizenship,yearsTeaching:teacher.yearsTeaching,yearsAtCurrentSchool:teacher.yearsAtCurrentSchool,phone:teacher.phone},statusHistory:{create:{toStatus:"DRAFT",reason:"Application draft created",changedBy:req.user.id}}}});await audit(req,"APPLICATION_CREATED","Application",data.id,{applicationNumber:number});res.status(201).json({data,message:"Draft created. Add required documents and submit when ready."})}catch(e){fail(res,e)}});

app.patch("/api/applications/:id/submit",allow("TEACHER"),async(req,res)=>{
  try{
    const teacher=await prisma.teacher.findUnique({where:{userId:req.user.id}});
    const application=await prisma.application.findUnique({where:{id:req.params.id},include:{documents:true,category:true,cycle:true}});
    if(!application||application.teacherId!==teacher?.id)return res.status(404).json({error:"Application not found."});
    if(!["DRAFT","RETURNED"].includes(application.status))return res.status(400).json({error:"Only drafts or returned applications can be submitted."});
    if(!application.documents.length)return res.status(400).json({error:"Upload at least one supporting document before submitting. Confirm all category-specific requirements with the official guide."});
    const now=new Date();
    if(application.cycle?.status!=="OPEN"||(application.cycle.opensAt&&now<application.cycle.opensAt)||(application.cycle.closesAt&&now>application.cycle.closesAt))return res.status(400).json({error:"The application period is not currently open."});
    const requirements=application.cycleId?await prisma.cycleCategoryRequirement.findMany({where:{cycleId:application.cycleId,categoryId:application.categoryId}}):[];
    const uploadedTypes=new Set(application.documents.map(document=>document.type));
    const warnings=requirements.filter(requirement=>requirement.required&&requirement.kind==="DOCUMENT"&&!uploadedTypes.has(requirement.id)).map(requirement=>requirement.label);
    const updated=await prisma.application.update({where:{id:application.id},data:{status:"SUBMITTED",submittedAt:now,statusHistory:{create:{fromStatus:application.status,toStatus:"SUBMITTED",reason:"Teacher submitted application",changedBy:req.user.id}}}});
    await audit(req,"APPLICATION_SUBMITTED","Application",application.id,{missingRequiredDocuments:warnings.length});
    res.json({data:updated,message:"Application submitted for district review.",warnings});
  }catch(e){fail(res,e)}});

app.post("/api/applications/:id/documents",allow("TEACHER"),upload.single("document"),async(req,res)=>{try{if(!req.file)return res.status(400).json({error:"Choose a PDF, JPG or PNG file."});const t=await prisma.teacher.findUnique({where:{userId:req.user.id}});const a=await prisma.application.findUnique({where:{id:req.params.id}});if(!a||a.teacherId!==t?.id){fs.unlinkSync(req.file.path);return res.status(404).json({error:"Application not found."})}if(!["DRAFT","RETURNED"].includes(a.status)){fs.unlinkSync(req.file.path);return res.status(400).json({error:"Documents can only be added to drafts or returned applications."})}const hash=crypto.createHash("sha256").update(fs.readFileSync(req.file.path)).digest("hex");const doc=await prisma.document.create({data:{applicationId:a.id,type:String(req.body.type||"SUPPORTING_DOCUMENT").slice(0,80),fileName:path.basename(req.file.originalname).slice(0,255),storagePath:req.file.filename,mimeType:req.file.mimetype,fileSize:req.file.size,sha256:hash}});await audit(req,"DOCUMENT_UPLOADED","Document",doc.id,{applicationId:a.id,type:doc.type,fileSize:doc.fileSize});res.status(201).json({data:{id:doc.id,type:doc.type,fileName:doc.fileName,status:doc.status,fileSize:doc.fileSize},message:"Document uploaded to private storage."})}catch(e){if(req.file&&fs.existsSync(req.file.path))fs.unlinkSync(req.file.path);if(e instanceof multer.MulterError)return res.status(400).json({error:e.code==="LIMIT_FILE_SIZE"?`File exceeds ${process.env.UPLOAD_MAX_MB||10} MB limit.`:"Upload failed."});fail(res,e)}});

app.get("/api/documents/:id/download",auth,async(req,res)=>{if(req.params.id.startsWith("registration-"))return res.redirect(307,`/api/registration-documents/${encodeURIComponent(req.params.id.slice("registration-".length))}/download`);try{const d=await prisma.document.findUnique({where:{id:req.params.id},include:{application:true}});if(!d)return res.status(404).json({error:"Document not found."});if(req.user.role==="TEACHER"){const t=await prisma.teacher.findUnique({where:{userId:req.user.id}});if(d.application.teacherId!==t?.id)return res.status(403).json({error:"Not authorised."})}if(req.user.role==="DISTRICT_ADMIN"&&(await districtForUser(req.user.id))!==d.application.districtId)return res.status(403).json({error:"Not authorised."});const file=path.join(uploadRoot,path.basename(d.storagePath));if(!fs.existsSync(file))return res.status(404).json({error:"Stored file is missing."});await audit(req,"DOCUMENT_DOWNLOADED","Document",d.id,{applicationId:d.applicationId});res.download(file,d.fileName)}catch(e){fail(res,e)}});

app.get("/api/registration-documents/:id/download",auth,async(req,res)=>{try{const d=await prisma.teacherRegistrationDocument.findUnique({where:{id:req.params.id},include:{teacher:true}});if(!d)return res.status(404).json({error:"Registration document not found."});if(req.user.role==="TEACHER"&&d.teacher.userId!==req.user.id)return res.status(403).json({error:"Not authorised."});if(req.user.role==="DISTRICT_ADMIN"){const districtId=await districtForUser(req.user.id);const linked=await prisma.application.count({where:{teacherId:d.teacherId,districtId}});if(!linked)return res.status(403).json({error:"Not authorised."})}const file=path.join(uploadRoot,path.basename(d.storagePath));if(!fs.existsSync(file))return res.status(404).json({error:"Stored file is missing."});await audit(req,"REGISTRATION_DOCUMENT_DOWNLOADED","TeacherRegistrationDocument",d.id,{teacherId:d.teacherId});res.download(file,d.fileName)}catch(e){fail(res,e)}});

app.post("/api/applications/:id/vetting",allow("DISTRICT_ADMIN"),async(req,res)=>{try{const a=await prisma.application.findUnique({where:{id:req.params.id},include:{documents:true,category:true}});if(!a)return res.status(404).json({error:"Application not found."});if((await districtForUser(req.user.id))!==a.districtId)return res.status(403).json({error:"Application is outside your district."});const b=req.body||{};const decision=String(b.decision||"PENDING");if(!["PENDING","RETURN","APPROVE","DISQUALIFY"].includes(decision))return res.status(400).json({error:"Invalid vetting decision."});const readYears=(value,label)=>{if(value===undefined||value==="")return null;const years=Number(value);if(!Number.isInteger(years)||years<0||years>60)throw new Error(`${label} must be a whole number from 0 to 60 years.`);return years};let serviceTenureYearsVerified,currentSchoolYearsVerified;try{serviceTenureYearsVerified=readYears(b.serviceTenureYearsVerified,"Verified total service");currentSchoolYearsVerified=readYears(b.currentSchoolYearsVerified,"Verified current-school service")}catch(e){return res.status(400).json({error:e.message})}if(serviceTenureYearsVerified!==null&&currentSchoolYearsVerified!==null&&currentSchoolYearsVerified>serviceTenureYearsVerified)return res.status(400).json({error:"Verified current-school service cannot exceed verified total service."});if(decision==="APPROVE"&&(!b.saceChecked||!b.qualificationChecked||!b.idChecked||!b.experienceChecked||!b.schoolVerified||!b.documentsComplete))return res.status(400).json({error:"Complete all core checks, including service-tenure evidence, before district approval."});if(decision==="APPROVE"&&(serviceTenureYearsVerified===null||currentSchoolYearsVerified===null))return res.status(400).json({error:"Record verified total service and current-school service before district approval."});if(decision==="APPROVE"&&serviceTenureYearsVerified<a.category.experienceMin)return res.status(400).json({error:`The verified ${serviceTenureYearsVerified} years do not meet the configured ${a.category.experienceMin}-year category minimum. Check the official award guide before deciding.`});const status=decision==="RETURN"?"RETURNED":decision==="APPROVE"?"DISTRICT_APPROVED":decision==="DISQUALIFY"?"DISTRICT_REJECTED":"UNDER_REVIEW";const fields={saceChecked:!!b.saceChecked,qualificationChecked:!!b.qualificationChecked,idChecked:!!b.idChecked,certificationCurrent:!!b.certificationCurrent,experienceChecked:!!b.experienceChecked,serviceTenureYearsVerified,currentSchoolYearsVerified,serviceTenureNotes:b.serviceTenureNotes?String(b.serviceTenureNotes).trim().slice(0,1000):null,schoolVerified:!!b.schoolVerified,documentsComplete:!!b.documentsComplete,previousWinnerChecked:!!b.previousWinnerChecked,specialNeedsReviewed:!!b.specialNeedsReviewed,decision,comments:b.comments?String(b.comments).slice(0,2000):null,vetterId:req.user.id,decidedAt:decision==="PENDING"?null:new Date()};await prisma.$transaction([prisma.vettingRecord.upsert({where:{applicationId:a.id},create:{applicationId:a.id,...fields},update:fields}),prisma.application.update({where:{id:a.id},data:{status,districtDecisionBy:decision==="APPROVE"||decision==="DISQUALIFY"?req.user.id:undefined,districtDecisionAt:decision==="APPROVE"||decision==="DISQUALIFY"?new Date():undefined,statusHistory:{create:{fromStatus:a.status,toStatus:status,reason:fields.comments||`District decision: ${decision}`,changedBy:req.user.id}}}})]);await audit(req,"DISTRICT_VETTING_RECORDED","Application",a.id,{decision,status,serviceTenureYearsVerified,currentSchoolYearsVerified});const teacher=await prisma.teacher.findUnique({where:{id:a.teacherId}});await notify(teacher.userId,"Application status updated",`Your application ${a.applicationNumber} status is now ${status.replaceAll("_"," ")}.`);res.json({ok:true,status,message:"Vetting decision recorded."})}catch(e){fail(res,e)}});

app.post("/api/applications/:id/provincial-decision",allow("PROVINCIAL_OFFICIAL","SYSTEM_ADMIN"),async(req,res)=>{try{const a=await prisma.application.findUnique({where:{id:req.params.id}});if(!a)return res.status(404).json({error:"Application not found."});if(a.status!=="DISTRICT_APPROVED")return res.status(400).json({error:"Only district-approved applications can receive provincial compliance decisions."});const decision=String(req.body?.decision||"");if(!["APPROVE","RETURN","DISQUALIFY"].includes(decision))return res.status(400).json({error:"Choose APPROVE, RETURN or DISQUALIFY."});const status=decision==="APPROVE"?"PROVINCIAL_COMPLIANCE_APPROVED":decision==="RETURN"?"RETURNED":"DISQUALIFIED";await prisma.application.update({where:{id:a.id},data:{status,provincialDecisionBy:req.user.id,provincialDecisionAt:new Date(),statusHistory:{create:{fromStatus:a.status,toStatus:status,reason:String(req.body?.reason||"Provincial compliance decision").slice(0,2000),changedBy:req.user.id}}}});await audit(req,"PROVINCIAL_DECISION_RECORDED","Application",a.id,{decision,status});res.json({ok:true,status})}catch(e){fail(res,e)}});

app.post("/api/applications/:id/disputes",allow("TEACHER"),async(req,res)=>{try{const t=await prisma.teacher.findUnique({where:{userId:req.user.id}});const a=await prisma.application.findUnique({where:{id:req.params.id}});if(!a||a.teacherId!==t?.id)return res.status(404).json({error:"Application not found."});const reason=String(req.body?.reason||"").trim(),details=String(req.body?.details||"").trim();if(!reason||details.length<10)return res.status(400).json({error:"Provide a reason and at least 10 characters of detail."});const d=await prisma.dispute.create({data:{applicationId:a.id,reason:reason.slice(0,200),details:details.slice(0,4000)}});await audit(req,"DISPUTE_SUBMITTED","Dispute",d.id,{applicationId:a.id});res.status(201).json({data:d})}catch(e){fail(res,e)}});

app.get("/api/disputes",allow("DISTRICT_ADMIN","PROVINCIAL_OFFICIAL","SYSTEM_ADMIN"),async(req,res)=>{try{const where={};if(req.user.role==="DISTRICT_ADMIN")where.application={districtId:await districtForUser(req.user.id)||"none"};res.json({data:await prisma.dispute.findMany({where,include:{application:{select:{applicationNumber:true,status:true,district:{select:{name:true}},teacher:{select:{firstName:true,surname:true}}}}},orderBy:{submittedAt:"desc"},take:300})})}catch(e){fail(res,e)}});

app.patch("/api/disputes/:id",allow("DISTRICT_ADMIN","PROVINCIAL_OFFICIAL","SYSTEM_ADMIN"),async(req,res)=>{try{const d=await prisma.dispute.findUnique({where:{id:req.params.id},include:{application:true}});if(!d)return res.status(404).json({error:"Dispute not found."});if(req.user.role==="DISTRICT_ADMIN"&&(await districtForUser(req.user.id))!==d.application.districtId)return res.status(403).json({error:"Not authorised."});const status=String(req.body?.status||"");if(!["UNDER_REVIEW","RESOLVED","REJECTED"].includes(status))return res.status(400).json({error:"Invalid dispute status."});const updated=await prisma.dispute.update({where:{id:d.id},data:{status,response:String(req.body?.response||"").slice(0,4000),resolvedAt:["RESOLVED","REJECTED"].includes(status)?new Date():null}});await audit(req,"DISPUTE_UPDATED","Dispute",d.id,{status});res.json({data:updated})}catch(e){fail(res,e)}});

app.get("/api/cycles",auth,async(_req,res)=>{try{res.json({data:await prisma.awardCycle.findMany({orderBy:{year:"desc"}})})}catch(e){fail(res,e)}});

app.get("/api/cycles/:cycleId/requirements",auth,async(req,res)=>{
  try{
    const cycle=await prisma.awardCycle.findUnique({where:{id:req.params.cycleId},select:{id:true}});
    if(!cycle)return res.status(404).json({error:"Award cycle not found."});
    const where={cycleId:cycle.id};
    if(req.query.categoryId)where.categoryId=String(req.query.categoryId);
    const data=await prisma.cycleCategoryRequirement.findMany({where,orderBy:[{categoryId:"asc"},{createdAt:"asc"}]});
    res.json({data});
  }catch(e){fail(res,e,"Could not load cycle requirements.")}});

app.put("/api/cycles/:cycleId/categories/:categoryId/requirements",allow("SYSTEM_ADMIN","PROVINCIAL_OFFICIAL"),async(req,res)=>{
  try{
    const {cycleId,categoryId}=req.params;
    const input=req.body?.requirements;
    if(!Array.isArray(input)||input.length>30)return res.status(400).json({error:"Provide up to 30 cycle/category requirements."});
    const cycle=await prisma.awardCycle.findUnique({where:{id:cycleId},select:{id:true}});
    const category=await prisma.ntaCategory.findUnique({where:{id:categoryId},select:{id:true}});
    if(!cycle||!category)return res.status(404).json({error:"Award cycle or category not found."});
    const rows=[];
    for(const entry of input){
      const kind=String(entry?.kind||"");
      const label=String(entry?.label||"").trim();
      const description=entry?.description==null?"":String(entry.description).trim();
      if(!["ELIGIBILITY","DOCUMENT"].includes(kind))return res.status(400).json({error:"Requirement type must be Eligibility or Document."});
      if(!label||label.length>160)return res.status(400).json({error:"Each requirement needs a label of up to 160 characters."});
      if(description.length>1000)return res.status(400).json({error:"Requirement details must be 1,000 characters or fewer."});
      if(entry?.required!==undefined&&typeof entry.required!=="boolean")return res.status(400).json({error:"Requirement required flags must be true or false."});
      rows.push({id:entry.id?String(entry.id):null,kind,label,description:description||null,required:entry.required!==false});
    }
    const duplicateLabels=rows.map(row=>`${row.kind}:${row.label.toLocaleLowerCase()}`);
    if(new Set(duplicateLabels).size!==duplicateLabels.length)return res.status(400).json({error:"Requirement labels must be unique within each type."});
    const saved=await prisma.$transaction(async tx=>{
      const existing=await tx.cycleCategoryRequirement.findMany({where:{cycleId,categoryId},select:{id:true}});
      const existingIds=new Set(existing.map(row=>row.id));
      const submittedIds=rows.filter(row=>row.id).map(row=>row.id);
      if(new Set(submittedIds).size!==submittedIds.length||submittedIds.some(id=>!existingIds.has(id)))throw Object.assign(new Error("One or more requirements no longer match this cycle and category. Reload and try again."),{status:409});
      await tx.cycleCategoryRequirement.deleteMany({
        where:{cycleId,categoryId,...(submittedIds.length?{id:{notIn:submittedIds}}:{})}
      });
      for(const row of rows){
        const {id,...data}=row;
        if(id)await tx.cycleCategoryRequirement.update({where:{id},data});
        else await tx.cycleCategoryRequirement.create({data:{...data,cycleId,categoryId}});
      }
      return tx.cycleCategoryRequirement.findMany({where:{cycleId,categoryId},orderBy:{createdAt:"asc"}});
    });
    await audit(req,"CYCLE_CATEGORY_REQUIREMENTS_UPDATED","AwardCycle",cycleId,{categoryId,count:saved.length});
    res.json({data:saved,message:"Cycle and category requirements saved."});
  }catch(e){if(e.status===409)return res.status(409).json({error:e.message});fail(res,e,"Could not save cycle requirements.")}});

const CYCLE_STATUSES=["DRAFT","CONFIGURED","PUBLISHED","OPEN","CLOSED","ARCHIVED"];
function cycleDates(opensAt,closesAt){
  const openDate=opensAt?new Date(opensAt):null;
  const closeDate=closesAt?new Date(closesAt):null;
  if((openDate&&Number.isNaN(openDate.getTime()))||(closeDate&&Number.isNaN(closeDate.getTime())))return{error:"Enter valid opening and closing dates."};
  if(openDate&&closeDate&&openDate>=closeDate)return{error:"Closing time must be after opening time."};
  return{openDate,closeDate};
}
function cycleGuide(value){
  if(!value)return{url:null};
  const url=String(value).trim();
  if(url.length>1000)return{error:"Official guide URL must be 1,000 characters or fewer."};
  try{
    const parsed=new URL(url);
    if(!["https:","http:"].includes(parsed.protocol))return{error:"Official guide URL must begin with http:// or https://."};
  }catch{return{error:"Enter a valid official guide URL."}}
  return{url};
}
function activeCycleConflict(){
  const error=new Error("Another award cycle is still open. Close it before opening this cycle.");
  error.cycleConflict=true;
  return error;
}
async function closeExpiredCycles(tx,exceptId){
  const now=new Date();
  const openCycles=await tx.awardCycle.findMany({where:{status:"OPEN",...(exceptId?{id:{not:exceptId}}:{})}});
  const expiredIds=openCycles.filter(c=>c.closesAt&&c.closesAt<=now).map(c=>c.id);
  const active=openCycles.filter(c=>!c.closesAt||c.closesAt>now);
  if(active.length)throw activeCycleConflict();
  if(expiredIds.length)await tx.awardCycle.updateMany({where:{id:{in:expiredIds}},data:{status:"CLOSED"}});
}

app.post("/api/cycles",allow("SYSTEM_ADMIN","PROVINCIAL_OFFICIAL"),async(req,res)=>{
  try{
    const body=req.body||{},name=String(body.name||"").trim(),year=Number(body.year),status=body.status||"DRAFT";
    if(!name||name.length>120||!Number.isInteger(year)||year<2000||year>2100)return res.status(400).json({error:"Enter a cycle name (up to 120 characters) and a year between 2000 and 2100."});
    if(!CYCLE_STATUSES.includes(status))return res.status(400).json({error:"Invalid cycle status."});
    const dates=cycleDates(body.opensAt,body.closesAt);
    if(dates.error)return res.status(400).json({error:dates.error});
    const guide=cycleGuide(body.guideUrl);
    if(guide.error)return res.status(400).json({error:guide.error});
    const c=await prisma.$transaction(async tx=>{
      if(status==="OPEN")await closeExpiredCycles(tx);
      return tx.awardCycle.create({data:{name,year,status,opensAt:dates.openDate,closesAt:dates.closeDate,guideUrl:guide.url,notes:body.notes?String(body.notes).trim().slice(0,2000):null}});
    });
    await audit(req,"AWARD_CYCLE_CREATED","AwardCycle",c.id,{name:c.name,status:c.status});
    res.status(201).json({data:c});
  }catch(e){
    if(e.cycleConflict)return res.status(409).json({error:e.message});
    if(e.code==="P2002")return res.status(409).json({error:"A cycle with this name already exists. Choose a different name."});
    fail(res,e);
  }
});

app.patch("/api/cycles/:id",allow("SYSTEM_ADMIN","PROVINCIAL_OFFICIAL"),async(req,res)=>{
  try{
    const body=req.body||{},statuses=CYCLE_STATUSES;
    const c=await prisma.awardCycle.findUnique({where:{id:req.params.id}});
    if(!c)return res.status(404).json({error:"Cycle not found."});
    if(body.status!==undefined&&!statuses.includes(body.status))return res.status(400).json({error:"Invalid cycle status."});
    if(["PUBLISHED","OPEN","CLOSED","ARCHIVED"].includes(c.status)&&body.status&&body.status!==c.status&&!["OPEN","CLOSED","ARCHIVED"].includes(body.status))return res.status(400).json({error:"Published cycles cannot be moved backwards. Create a new cycle for amendments."});
    const dates=cycleDates(body.opensAt===undefined?c.opensAt:body.opensAt,body.closesAt===undefined?c.closesAt:body.closesAt);
    if(dates.error)return res.status(400).json({error:dates.error});
    const guide=body.guideUrl===undefined?null:cycleGuide(body.guideUrl);
    if(guide?.error)return res.status(400).json({error:guide.error});
    const data={};
    if(body.name!==undefined){const name=String(body.name).trim();if(!name||name.length>120)return res.status(400).json({error:"Cycle name must be between 1 and 120 characters."});data.name=name}
    if(body.year!==undefined){const year=Number(body.year);if(!Number.isInteger(year)||year<2000||year>2100)return res.status(400).json({error:"Cycle year must be between 2000 and 2100."});data.year=year}
    if(body.status!==undefined)data.status=body.status;
    if(body.notes!==undefined)data.notes=body.notes?String(body.notes).trim().slice(0,2000):null;
    if(body.guideUrl!==undefined)data.guideUrl=guide.url;
    if(body.opensAt!==undefined)data.opensAt=dates.openDate;
    if(body.closesAt!==undefined)data.closesAt=dates.closeDate;
    const nextStatus=data.status||c.status;
    const updated=await prisma.$transaction(async tx=>{
      if(nextStatus==="OPEN")await closeExpiredCycles(tx,c.id);
      return tx.awardCycle.update({where:{id:c.id},data});
    });
    await audit(req,"AWARD_CYCLE_UPDATED","AwardCycle",c.id,{changes:data});
    res.json({data:updated});
  }catch(e){
    if(e.cycleConflict)return res.status(409).json({error:e.message});
    if(e.code==="P2002")return res.status(409).json({error:"A cycle with this name already exists. Choose a different name."});
    fail(res,e);
  }
});

app.get("/api/reassessment-tasks",allow("DISTRICT_ADMIN","PROVINCIAL_OFFICIAL","SYSTEM_ADMIN"),async(req,res)=>{try{const where={};if(req.user.role==="DISTRICT_ADMIN")where.application={districtId:await districtForUser(req.user.id)||"none"};res.json({data:await prisma.reassessmentTask.findMany({where,include:{application:{select:{applicationNumber:true,status:true,districtId:true}}},orderBy:{createdAt:"desc"},take:300})})}catch(e){fail(res,e)}});

app.post("/api/reassessment-tasks",allow("DISTRICT_ADMIN","PROVINCIAL_OFFICIAL","SYSTEM_ADMIN"),async(req,res)=>{try{const {applicationId,title,reason,dueAt}=req.body||{};const a=await prisma.application.findUnique({where:{id:String(applicationId||"")}});if(!a)return res.status(400).json({error:"Choose a valid application."});if(req.user.role==="DISTRICT_ADMIN"&&(await districtForUser(req.user.id))!==a.districtId)return res.status(403).json({error:"Application is outside your district."});if(!title||!reason)return res.status(400).json({error:"Task title and reason are required."});const task=await prisma.reassessmentTask.create({data:{applicationId:a.id,title:String(title).slice(0,200),reason:String(reason).slice(0,2000),dueAt:dueAt?new Date(dueAt):null,createdBy:req.user.id}});await audit(req,"REASSESSMENT_TASK_CREATED","ReassessmentTask",task.id,{applicationId:a.id});res.status(201).json({data:task})}catch(e){fail(res,e)}});

app.patch("/api/reassessment-tasks/:id",allow("DISTRICT_ADMIN","PROVINCIAL_OFFICIAL","SYSTEM_ADMIN"),async(req,res)=>{try{const t=await prisma.reassessmentTask.findUnique({where:{id:req.params.id},include:{application:true}});if(!t)return res.status(404).json({error:"Task not found."});if(req.user.role==="DISTRICT_ADMIN"&&(await districtForUser(req.user.id))!==t.application.districtId)return res.status(403).json({error:"Not authorised."});const allowed=["PENDING","ASSIGNED","IN_PROGRESS","AWAITING_INFORMATION","COMPLETED","CANCELLED"];const status=String(req.body?.status||t.status);if(!allowed.includes(status))return res.status(400).json({error:"Invalid task status."});const data={status};if(req.body.assignedTo!==undefined)data.assignedTo=req.body.assignedTo||null;if(req.body.outcome!==undefined)data.outcome=String(req.body.outcome).slice(0,2000);if(status==="COMPLETED")data.completedAt=new Date();const updated=await prisma.reassessmentTask.update({where:{id:t.id},data});await audit(req,"REASSESSMENT_TASK_UPDATED","ReassessmentTask",t.id,{status,assignedTo:data.assignedTo||t.assignedTo});res.json({data:updated})}catch(e){fail(res,e)}});

app.get("/api/notifications",auth,async(req,res)=>{try{res.json({data:await prisma.notification.findMany({where:{userId:req.session.userId},orderBy:{createdAt:"desc"},take:100})})}catch(e){fail(res,e)}});

app.patch("/api/notifications/:id/read",auth,async(req,res)=>{try{const n=await prisma.notification.findFirst({where:{id:req.params.id,userId:req.session.userId}});if(!n)return res.status(404).json({error:"Notification not found."});await prisma.notification.update({where:{id:n.id},data:{readAt:new Date()}});res.json({ok:true})}catch(e){fail(res,e)}});

app.get("/api/reports/export.csv",allow("PROVINCIAL_OFFICIAL","SYSTEM_ADMIN"),async(req,res)=>{try{const rows=await prisma.application.findMany({where:{status:"PROVINCIAL_COMPLIANCE_APPROVED",exportedAt:null},include:{teacher:true,category:true,district:true,school:true,cycle:true},orderBy:{submittedAt:"asc"}});const cols=["applicationNumber","status","submittedAt","teacher.firstName","teacher.surname","teacher.saceNumber","category.name","district.name","school.name","cycle.name"];const val=(r,k)=>k.split(".").reduce((o,p)=>o?.[p],r);const csv=[cols.join(","),...rows.map(r=>cols.map(k=>'"'+String(val(r,k)??"").replace(/"/g,'""')+'"').join(","))].join("\r\n");await prisma.$transaction(rows.map(r=>prisma.application.update({where:{id:r.id},data:{exportedAt:new Date()}})));await audit(req,"PROVINCIAL_EXPORT_CREATED","Application",null,{count:rows.length,scope:"PROVINCIAL_COMPLIANCE_APPROVED"});res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Content-Disposition",`attachment; filename="nta-approved-${new Date().toISOString().slice(0,10)}.csv"`);res.send(csv)}catch(e){fail(res,e)}});

app.get("/api/audit-logs",allow("SYSTEM_ADMIN","PROVINCIAL_OFFICIAL"),async(req,res)=>{try{const data=await prisma.auditLog.findMany({include:{user:{select:{email:true,role:true}}},orderBy:{createdAt:"desc"},take:500});res.json({data})}catch(e){fail(res,e)}});

app.post("/api/admin/schools",allow("SYSTEM_ADMIN","PROVINCIAL_OFFICIAL"),async(req,res)=>{try{const {name,emisNumber,schoolType,districtId,quintile,urbanRural}=req.body||{};if(!name||!emisNumber||!schoolType||!districtId)return res.status(400).json({error:"School name, EMIS number, type and district are required."});const s=await prisma.school.create({data:{name:String(name).slice(0,200),emisNumber:String(emisNumber).slice(0,40),schoolType:String(schoolType).slice(0,80),districtId:String(districtId),quintile:quintile?String(quintile):null,urbanRural:urbanRural?String(urbanRural):null}});await audit(req,"SCHOOL_CREATED","School",s.id,{name:s.name,emisNumber:s.emisNumber});res.status(201).json({data:s})}catch(e){if(e.code==="P2002")return res.status(409).json({error:"EMIS number already exists."});fail(res,e)}});



// Public site configuration, published content and anonymous aggregate visit counts.

const defaultSettings={siteTitle:"Northern Cape NTA",tagline:"Apply, track and review teaching awards in one secure place.",theme:"forest",metaDescription:"Northern Cape National Teaching Awards digital application and district review portal.",contactEmail:"",domain:"",emailAlerts:"off"};

app.get("/api/public/settings",async(_req,res)=>{try{const rows=await prisma.siteSetting.findMany();const out={...defaultSettings};for(const r of rows)if(Object.hasOwn(out,r.key))out[r.key]=r.value;res.json({data:out})}catch(e){fail(res,e)}});

app.get("/api/public/pages",async(_req,res)=>{try{res.json({data:await prisma.contentPage.findMany({where:{published:true},select:{slug:true,title:true,summary:true,updatedAt:true},orderBy:{updatedAt:"desc"}})})}catch(e){fail(res,e)}});

app.get("/api/public/pages/:slug",async(req,res)=>{try{const data=await prisma.contentPage.findFirst({where:{slug:req.params.slug,published:true}});if(!data)return res.status(404).json({error:"Page not found."});res.json({data})}catch(e){fail(res,e)}});

const trafficWindow=new Map();

app.post("/api/public/visit",async(req,res)=>{try{const now=Date.now(),key=crypto.createHash("sha256").update(String(req.ip)+String(req.body?.path||"/")).digest("hex");if(now-(trafficWindow.get(key)||0)>60_000){trafficWindow.set(key,now);const page=String(req.body?.path||"/").slice(0,150);await prisma.siteEvent.create({data:{type:"PAGE_VIEW",path:page}})}if(trafficWindow.size>10000)trafficWindow.clear();res.json({ok:true})}catch(e){fail(res,e)}});

app.get("/api/admin/overview",allow("SYSTEM_ADMIN","PROVINCIAL_OFFICIAL"),async(req,res)=>{try{
  const now=new Date(),activeTaskStatuses=["PENDING","ASSIGNED","IN_PROGRESS","AWAITING_INFORMATION"];
  const [users,applications,visits,errors,recent,byStatus,events,cycles,openDisputes,pendingTasks,overdueTasks]=await Promise.all([
    prisma.user.count(),
    prisma.application.count(),
    prisma.siteEvent.count({where:{type:"PAGE_VIEW"}}),
    prisma.siteEvent.count({where:{type:"SERVER_ERROR"}}),
    prisma.auditLog.findMany({orderBy:{createdAt:"desc"},take:25,select:{action:true,entityType:true,createdAt:true}}),
    prisma.application.groupBy({by:["status"],_count:{_all:true}}),
    prisma.siteEvent.findMany({where:{type:"PAGE_VIEW",createdAt:{gte:new Date(now.getTime()-14*86400000)}},select:{createdAt:true}}),
    prisma.awardCycle.findMany({orderBy:[{year:"desc"},{updatedAt:"desc"}],take:100,select:{id:true,name:true,year:true,status:true,opensAt:true,closesAt:true}}),
    prisma.dispute.count({where:{status:{in:["OPEN","UNDER_REVIEW"]}}}),
    prisma.reassessmentTask.count({where:{status:{in:activeTaskStatuses}}}),
    prisma.reassessmentTask.count({where:{status:{in:activeTaskStatuses},dueAt:{lt:now}}})
  ]);
  const daily={};for(const e of events){const k=e.createdAt.toISOString().slice(0,10);daily[k]=(daily[k]||0)+1}
  const workflow=Object.fromEntries(byStatus.map(x=>[x.status,x._count._all]));
  workflow.openDisputes=openDisputes;workflow.pendingTasks=pendingTasks;workflow.overdueTasks=overdueTasks;
  const currentCycle=cycles.find(c=>c.status==="OPEN"&&(!c.closesAt||c.closesAt>=now))||cycles.find(c=>c.opensAt&&c.opensAt>now&&c.status!=="ARCHIVED")||null;
  res.json({data:{users,applications,visits,errors,recent,byStatus,daily,workflow,cycles:cycles.slice(0,12),currentCycle,uptimeSeconds:Math.round(process.uptime()),memoryMB:Math.round(process.memoryUsage().rss/1048576),database:"connected"}});
}catch(e){fail(res,e)}});

app.get("/api/admin/settings",allow("SYSTEM_ADMIN"),async(_req,res)=>{try{const rows=await prisma.siteSetting.findMany();const data={...defaultSettings};for(const row of rows)if(Object.hasOwn(data,row.key))data[row.key]=row.value;res.json({data})}catch(e){fail(res,e)}});

app.put("/api/admin/settings",allow("SYSTEM_ADMIN"),async(req,res)=>{try{const changed={};for(const [key,value] of Object.entries(req.body||{})){if(!Object.hasOwn(defaultSettings,key))continue;const val=String(value).slice(0,1000);if(key==="theme"&&!['forest','ocean','slate'].includes(val))return res.status(400).json({error:"Invalid theme"});if(key==="emailAlerts"&&!['off','on'].includes(val))return res.status(400).json({error:"Invalid alert preference"});await prisma.siteSetting.upsert({where:{key},create:{key,value:val},update:{value:val}});changed[key]=val}await audit(req,"SITE_SETTINGS_UPDATED","SiteSetting",null,{keys:Object.keys(changed)});res.json({data:changed})}catch(e){fail(res,e)}});

app.get("/api/admin/pages",allow("SYSTEM_ADMIN","PROVINCIAL_OFFICIAL"),async(_req,res)=>{try{res.json({data:await prisma.contentPage.findMany({orderBy:{updatedAt:"desc"}})})}catch(e){fail(res,e)}});

app.post("/api/admin/pages",allow("SYSTEM_ADMIN"),async(req,res)=>{try{const {slug,title,summary,body,published}=req.body||{};if(!/^[a-z0-9-]{2,80}$/.test(String(slug||""))||!String(title||"").trim())return res.status(400).json({error:"Provide a title and a lowercase URL slug."});const data=await prisma.contentPage.create({data:{slug,title:String(title).slice(0,160),summary:String(summary||"").slice(0,1000),body:String(body||"").slice(0,30000),published:published===true}});await audit(req,"CONTENT_CREATED","ContentPage",data.id);res.status(201).json({data})}catch(e){if(e.code==='P2002')return res.status(409).json({error:"Slug already exists."});fail(res,e)}});

app.patch("/api/admin/pages/:id",allow("SYSTEM_ADMIN"),async(req,res)=>{try{const changes={};for(const k of ['slug','title','summary','body','published'])if(req.body?.[k]!==undefined)changes[k]=k==='published'?req.body[k]===true:String(req.body[k]).slice(0,k==='body'?30000:1000);if(changes.slug&&!/^[a-z0-9-]{2,80}$/.test(changes.slug))return res.status(400).json({error:"Invalid slug."});const data=await prisma.contentPage.update({where:{id:req.params.id},data:changes});await audit(req,"CONTENT_UPDATED","ContentPage",data.id);res.json({data})}catch(e){fail(res,e)}});

app.delete("/api/admin/pages/:id",allow("SYSTEM_ADMIN"),async(req,res)=>{try{await prisma.contentPage.delete({where:{id:req.params.id}});await audit(req,"CONTENT_DELETED","ContentPage",req.params.id);res.json({ok:true})}catch(e){fail(res,e)}});

app.post("/api/admin/pages/bulk",allow("SYSTEM_ADMIN"),async(req,res)=>{try{const ids=Array.isArray(req.body?.ids)?req.body.ids.filter(x=>typeof x==='string').slice(0,100):[];if(!ids.length)return res.status(400).json({error:"Select pages first."});const action=req.body.action;let result;if(action==='publish')result=await prisma.contentPage.updateMany({where:{id:{in:ids}},data:{published:true}});else if(action==='unpublish')result=await prisma.contentPage.updateMany({where:{id:{in:ids}},data:{published:false}});else if(action==='delete')result=await prisma.contentPage.deleteMany({where:{id:{in:ids}}});else return res.status(400).json({error:"Invalid action"});await audit(req,"CONTENT_BULK_"+action.toUpperCase(),"ContentPage",null,{count:result.count});res.json({count:result.count})}catch(e){fail(res,e)}});

app.get("/api/admin/backup.json",allow("SYSTEM_ADMIN"),async(req,res)=>{try{const [pages,settings,categories,districts,schools]=await Promise.all([prisma.contentPage.findMany(),prisma.siteSetting.findMany(),prisma.ntaCategory.findMany(),prisma.district.findMany(),prisma.school.findMany()]);await audit(req,"CONFIG_BACKUP_EXPORTED","System",null);res.setHeader('Content-Disposition','attachment; filename="nta-config-backup.json"');res.json({format:"NTA-CONFIG-1",createdAt:new Date().toISOString(),note:"Configuration export only. Not a full database backup; excludes users, applications, evidence, uploads and sessions.",pages,settings,categories,districts,schools})}catch(e){fail(res,e)}});

app.post("/api/admin/import/pages",allow("SYSTEM_ADMIN"),async(req,res)=>{try{const items=req.body?.pages;if(!Array.isArray(items)||items.length>100)return res.status(400).json({error:"Provide up to 100 pages."});let count=0;for(const row of items){if(!/^[a-z0-9-]{2,80}$/.test(String(row.slug||''))||!row.title)continue;await prisma.contentPage.upsert({where:{slug:row.slug},create:{slug:row.slug,title:String(row.title).slice(0,160),body:String(row.body||'').slice(0,30000),summary:String(row.summary||'').slice(0,1000),published:false},update:{title:String(row.title).slice(0,160),body:String(row.body||'').slice(0,30000),summary:String(row.summary||'').slice(0,1000),published:false}});count++}await audit(req,"CONTENT_IMPORTED","ContentPage",null,{count});res.json({count,notice:"Imported pages are unpublished until reviewed."})}catch(e){fail(res,e)}});

app.get("/api/admin/system",allow("SYSTEM_ADMIN"),async(_req,res)=>{try{await prisma.$queryRaw`SELECT 1`;res.json({data:{status:"healthy",database:"connected",uptimeSeconds:Math.round(process.uptime()),memoryMB:Math.round(process.memoryUsage().rss/1048576),node:process.version}})}catch(e){res.status(503).json({error:"Database unavailable"})}});

app.get("/api",(_req,res)=>res.json({name:"Northern Cape NTA Management System",version:"2.0.0",health:"/api/health"}));

app.get("/{*splat}",(_req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.use((err,_req,res,_next)=>{console.error(err);prisma.siteEvent.create({data:{type:"SERVER_ERROR",path:String(_req.path||"").slice(0,150),metadata:{message:String(err.message||"Error").slice(0,180)}}}).catch(()=>{});if(err.message&&err.message.includes("Only PDF"))return res.status(400).json({error:err.message});res.status(500).json({error:"Unexpected server error."})});

const server=app.listen(PORT,()=>console.log(`Northern Cape NTA Management System running at http://localhost:${PORT}`));

async function stop(){server.close();await prisma.$disconnect();await pool.end();process.exit(0)}process.on("SIGINT",stop);process.on("SIGTERM",stop);
