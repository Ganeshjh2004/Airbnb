
if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}

console.log(process.env.SECRET);

const express = require("express");
const app = express();
const  mongoose = require("mongoose");
const  path = require("path");
const methodoverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const Listing = require('./models/listing.js');

//privacy and terms routes
const legalRoutes = require('./routes/legal.js');


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended : true}));
app.use(methodoverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const dbUrl = process.env.ATLASDB_URL;

main().then(()=>{
    console.log("connected to db");
}).catch((err)=>{
    console.log(err);
})
async function main(){
    await mongoose.connect(dbUrl);
}


const store=MongoStore.create({
    mongoUrl:dbUrl,
    crypto :{
        secret : process.env.SECRET,
    },
    touchAfter : 24 * 3600 ,
});

store.on("error",()=>{
    console.log("ERROR IN MONGO SESSION STORE",err);
});


const sessionOptions = {
    store,
    secret : process.env.SECRET,
    resave:false,
    saveUninitialized : true,
    cookie :{
        expire:Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly : true,
    } 

};


// app.get("/",(req,res)=>{
//     res.send("Hi I am root");
// })





app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// app.get("/demouser",async (req,res) => {
//      let fakeUser = new User({
//         email : "student@gmail.com",
//         username:"sigma-student",
//      })
//      let registeredUser = await User.register(fakeUser,"helloworld");
//      res.send(registeredUser);
// })

app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);
app.use('/', legalRoutes);
app.use("/", (req, res) => {// changed the root path
  res.redirect("/listings");
});



app.use("/search",async (req,res)=> {
    
    try {
        let {searchList}= req.body;
        let list = await Listing.find({ 
            country: { $regex: searchList, $options: "i" } 
        });        
        res.render("listings/search.ejs",{list});
    }
    catch (err) {
        res.status(500).send({ message: err.message || "Error Occured" })
    }
    
});

app.get("/categories/:category", async (req, res) => {
    const { category } = req.params;
    try {
        // Fetch listings that match the category, case-insensitively
        const listings = await Listing.find({ category: { $regex: new RegExp(`^${category}$`, "i") } });
        
        // Render the index page with filtered listings
        res.render("listings/index", { allListings: listings });
    } catch (err) {
        req.flash("error", "Unable to fetch listings for this category.");
        res.redirect("/");
    }
});


//privacy and terms routes  
// app.use("/privacy",async (req,res)=>{
//     res.render("listings/privacy.ejs");
// });
// app.use("/terms",async (req,res)=>{
//     res.render("listings/terms.ejs");
// });


app.all("*",(req,res,next) => {
    next(new ExpressError(404, "Page Not Found!"));
})


app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something Went Wrong" } = err;
    res.status(statusCode).render("listings/error", { message });
});

app.listen(8080,()=>{
    console.log("app listening to port 8080");
})
