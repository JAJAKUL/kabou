const { SERVERURL, HOST, PORT, SERVERIMAGEPATH, SERVERIMAGEUPLOADPATH } = require('../../config/bootstrap');
//Session
var session = require('express-session');

var itemCategorySchema = require('../../schema/Category');



module.exports.categoryAdd = async (req, res) => {

    var user = req.session.user;

    res.render('itemCategory/categoryAdd.ejs', {
        layout: false,
        user: user
    });
}
module.exports.categoryAddPost = async (req, res) => {

    var files = req.files;
    var reqBody = req.body;

    var image = await uploadImage(files.image, 'rescategory');

    if (image != 'error') {

        var categoryAdd = {
            categoryName: reqBody.categoryName,
            image: image,
            isActive: true
        }

        new itemCategorySchema(categoryAdd).save(function (err, admin) {
            if (err) {
                console.log('err', err);
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            } else {
                req.flash('msgLog', 'Category added successfully.');
                req.flash('msgType', 'success');
                res.redirect('/itemCategory/itemCategoryList');
                return;

            }
        })
       

    } else {

        req.flash('msgLog', 'Category image upload failed.');
        req.flash('msgType', 'danger');
        res.redirect(req.headers.referer);
        return;
    }

    
}

module.exports.categoryEdit = async (req, res) => {

    var user = req.session.user;

    var categoryId = req.query.id;
    var responseDt = {};

    if (categoryId != undefined) {


        itemCategorySchema
            .findOne({ _id: categoryId })
            .then(async function (category) {

                if (category != null) {

                    var imagePath = `${SERVERIMAGEPATH}category/`

                    res.render('itemCategory/categoryEdit.ejs', {
                        category: category, categoryId: categoryId,
                        layout: false,
                        user: user,
                        serverImagePath: imagePath
                    });


                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }

            });

    }


}
module.exports.categoryEditPost = async (req, res) => {

    var files = req.files;
    var reqBody = req.body;


    var categoryId = reqBody.categoryId;

    console.log(reqBody);
    // return;

    itemCategorySchema
        .findOne({ _id: categoryId })
        .then(async (categoryGet) => {

            if (categoryGet != null) {
                var catData = {}
                //License Upload

                if (files != null) {
                    if (files.image != undefined) {

                        if (categoryGet.image != '') {
                            var fs = require('fs');
                            var filePath = `${SERVERIMAGEUPLOADPATH}category/${categoryGet.image}`;
                            fs.unlink(filePath, (err) => { 
                                console.log('err',err);
                            });
                        }
                        var image = await uploadImage(files.image, 'menucategory');
                    } else {
                        var image = categoryGet.image;
                    }
                } else {
                    var image = categoryGet.image;
                }


                if (image != 'error') {
                    catData.categoryName = reqBody.categoryName,
                        catData.image = image,



                        itemCategorySchema.updateOne({ _id: categoryId }, {
                            $set: catData
                        }, async function (err, result) {
                            if (err) {
                                console.log(err);
                                req.flash('msgLog', 'Something went wrong.');
                                req.flash('msgType', 'danger');
                                res.redirect(req.headers.referer);
                                return;
                            } else {
                                req.flash('msgLog', 'Category updated successfully.');
                                req.flash('msgType', 'success');
                                res.redirect('/itemCategory/itemCategoryList');
                                return;
                            }
                        });
                } else {

                    req.flash('msgLog', 'Category image upload failed.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }
            } else {

                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            }

        })
        .catch((err) => {
            console.log('err', err);
            req.flash('msgLog', 'Something went wrong.');
            req.flash('msgType', 'danger');
            res.redirect(req.headers.referer);
            return;
        })


}

module.exports.categoryList = (req, res) => {

    var user = req.session.user;

    itemCategorySchema.find({isDeleted: { $ne: true }})
        .sort({ sortOrder: 1 })
        .then(async (categories) => {

            var imagePath = `${SERVERIMAGEPATH}category/`

            res.render('itemCategory/categoryList.ejs', {
                categories: categories,
                layout: false,
                user: user,
                serverImagePath: imagePath
            });
        });
}

module.exports.updateSorting = async (req, res) => {

    var reqBdy = req.body;

    var allIdSort = reqBdy.id;

    if(allIdSort.length > 0) {

        for (const [key, value] of Object.entries(allIdSort)) {

            await itemCategorySchema.updateOne({ _id: value }, {
                $set: {sortOrder: key}
            })
          }
    }

    var responseObj = {
        msg: '',
        body: {}
    };
    res.status(200).json(responseObj)
    
}

module.exports.changeStatus = (req, res) => {

    var categoryId = req.query.id;
    var status = req.query.status;
    if (categoryId != undefined) {

        if (status == 'Active') {
            var isActive = false
        } else {
            var isActive = true
        }


        itemCategorySchema.updateOne({ _id: categoryId }, {
            $set: {
                isActive: isActive
            }
        }, function (err, resp) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            } else {
                if (resp.nModified == 1) {
                    req.flash('msgLog', 'Status updated successfully.');
                    req.flash('msgType', 'success');
                    res.redirect(req.headers.referer);
                    return;
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }
            }
        });

    }
}

module.exports.deleteCategory = (req, res) => {

    var categoryId = req.query.id;
    if (categoryId != undefined) {

        itemCategorySchema.updateOne({ _id: categoryId }, {
            $set: {
                isDeleted: true, isActive: false
            }
        }, function (err, resp) {
            if (err) {
                req.flash('msgLog', 'Something went wrong.');
                req.flash('msgType', 'danger');
                res.redirect(req.headers.referer);
                return;
            } else {
                if (resp.nModified == 1) {
                    req.flash('msgLog', 'Category deleted successfully.');
                    req.flash('msgType', 'success');
                    res.redirect(req.headers.referer);
                    return;
                } else {
                    req.flash('msgLog', 'Something went wrong.');
                    req.flash('msgType', 'danger');
                    res.redirect(req.headers.referer);
                    return;
                }
            }
        });

    }
}

//Category Related Image uplaod
function uploadImage(file, name) {
    return new Promise(function (resolve, reject) {
        console.log(file.name);
        //Get image extension
        var ext = getExtension(file.name);

        // The name of the input field (i.e. "image") is used to retrieve the uploaded file
        let sampleFile = file;

        var file_name = `${name}-${Math.floor(Math.random() * 1000)}-${Math.floor(Date.now() / 1000)}.${ext}`;

        // Use the mv() method to place the file somewhere on your server
        sampleFile.mv(`${SERVERIMAGEUPLOADPATH}category/${file_name}`, function (err) {
            if (err) {
                console.log('err', err);
                return reject('error');
            } else {
                return resolve(file_name);
            }
        });
    });
}

function getExtension(filename) {
    return filename.substring(filename.indexOf('.') + 1);
}



