exports.privacy = async (req, res) => {
    try {
        res.render("listings/privacy.ejs");
    } catch (error) {
        res.status(500).send('Error loading the privacy page');
    }
};

exports.terms = async (req, res) => {
    try {
        res.render("listings/terms.ejs");
    } catch (error) {
        res.status(500).send('Error loading the terms page');
    }
};


