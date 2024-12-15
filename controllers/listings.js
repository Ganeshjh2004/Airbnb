const listing = require("../models/listing");
const Listing = require("../models/listing.js");
const { listingSchema } = require('../schema.js');


module.exports.index = async (req,res)=>{
    const allListings=await Listing.find({})
    res.render("listings/index.ejs",{allListings});
};




    


module.exports.renderNewForm = (req,res)=>{
    
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req,res)=>{
    let {id} = req.params;
    const listing1 = await listing.findById(id).populate({path :"reviews", populate : {
        path : "author",
    }}).populate("owner");
    if(!listing1){
        req.flash("success","Listing you requested for does not exist!");
        res.redirect("/listings");
    }
    console.log(listing1);
    res.render("listings/show.ejs",{listing1});
}

module.exports.createListing =async (req, res, next) => {
    let url=req.file.path;
    let filename=req.file.path
  
    const newListing = new Listing(req.body.listing);
    newListing.owner =req.user._id;
    newListing.image={url,filename};
   await newListing.save();
   req.flash("success","New Listing Created!");
   res.redirect("/listings");
};


module.exports.editListing = async (req,res)=>{
    let {id} = req.params;
    const Listing = await listing.findById(id);
    if(!Listing){
        req.flash("success","Listing you requested for does not exist!");
        res.redirect("/listings");
    }

    let originalImageUrl =Listing.image.url;
    originalImageUrl= originalImageUrl.replace("/upload","/upload/w_250");
    res.render("listings/edit.ejs",{Listing,  originalImageUrl});
    };


module.exports.updateListing = async (req,res)=>{
    let {id} = req.params;
    let listing = await Listing.findById(id);
    let updatedlist = await Listing.findByIdAndUpdate(id,{...req.body.listing});
    
    if(typeof req.file !=="undefined"){
        let url = req.file.path;
        let filename = req.file.filename;
        updatedlist.image = {url,filename};
        await updatedlist.save();
    }
   

    req.flash("success","Listing Updated");
    res.redirect(`/listings/${id}`);
    };

module.exports.destroyListing = async (req,res)=>{
    let {id} = req.params;
    await listing.findByIdAndDelete(id);
    req.flash("success","Lsiting Deleted");
    res.redirect("/listings");
    };