const Product = require('../models/products');
const { validationResult } = require('express-validator/check');
const fileHelper = require('../util/file');





// GET: ADD-PRODUCT ===============================================================================
exports.getAddProduct = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        errorMessage: undefined,
        validationErrors: [],
        isAuthenticated: req.session.isLoggedIn
    });
};





// POST: ADD-PRODUCT ==============================================================================
exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;

    if(!image) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            product: {
                title: title,
                price: price,
                description: description
            },
            hasError: true,
            errorMessage: "Attached file is not an image.",
            validationErrors: [],
        });
    }

    const errors = validationResult(req);

    if( !errors.isEmpty() ) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            product: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description
            },
            hasError: true,
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array(),
        });
    }

    const imageUrl = image.path;

    const product = new Product(
        {
            title: title, 
            imageUrl: imageUrl, 
            price: price, 
            description: description,
            userId: req.user
        }
    );
    product.save()
        .then( result => {
            res.redirect('/admin/products');
        })
        .catch( (err) => {
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        })
    ;
};





// GET: EDIT-PRODUCT ==============================================================================
exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if(!editMode) { return res.redirect('/'); }

    const prodId = req.params.productId;

    Product.findById(prodId)
        .then( product => {
            if(!product) { return res.redirect('/') }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Product',
                path: '/admin/edit-product',
                editing: editMode,
                product: product,
                hasError: false,
                errorMessage: undefined,
                validationErrors: []
            });
        } )
        .catch( (err) => {
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        })
    ;
};





// POST: EDIT-PRODUCT =============================================================================
exports.postEditProduct = (req, res, next) => {

    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const image = req.file;
    const updatedPrice = req.body.price;
    const updatedDescription = req.body.description;

    const errors = validationResult(req);
    
    if( !errors.isEmpty() ) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            product: {
                _id: prodId,
                title: updatedTitle,
                price: updatedPrice,
                description: updatedDescription
            },
            hasError: true,
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array(),
            isAuthenticated: req.session.isLoggedIn
        });
    }

    Product.findById(prodId)
        .then( product => {
            if( product.userId.toString() !== req.user._id.toString() ) {
                return res.redirect('/');
            }

            product.title = updatedTitle;
            product.price = updatedPrice;
            product.description = updatedDescription;
            if(image) {
                fileHelper.deleteFile = product.imageUrl;       // delete old file
                product.imageUrl = image.path;
            }

            return product.save()
                .then( result => {
                    res.redirect('/admin/products');
                })
            ;
        })

        .catch( (err) => {
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        })
    ;
};





// GET: PRODUCTS ==================================================================================
exports.getProducts = (req, res, next) => {
    Product.find()
        .then( products => {
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products',
                isAuthenticated: req.session.isLoggedIn
            });
        } )
        .catch( (err) => {
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        })
    ;
};





// POST: DELETE-PRODUCT ===========================================================================
exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.params.productId;

    Product.findById(prodId)
        .then( product => {
            if(!product) {
                return next(new Error('Product not found.'));
            }
            fileHelper.deleteFile(product.imageUrl);
            return Product.deleteOne( { _id: prodId, userId: req.user._id } )
        } )
        .then( () => {
            console.log("Deleted...");
            res.status(200).json({message: 'Successfully Deleted.'});
        })
        .catch( (err) => {
            console.log("Delete failed.");
            res.status(500).json({message: 'Deleting Product Failed !'});
        })
    ;
};
