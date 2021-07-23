const fs = require('fs');                                  // DEV Secrets and PDF writing
const path = require('path');
const PDFDocument = require('pdfkit');

const ibm = require('ibm-cos-sdk');                        // IBM COS bucket


// ALL SECRETS ....................................................................................
// const fsSecrets = fs.readFileSync(path.join( __dirname, '../', 'secrets.json'));     // DEV SECRET
// const mySecrets = JSON.parse(fsSecrets);                                             // DEV SECRET
// // ----
// const COS_API_KEY = mySecrets.COS_API_KEY;                              // DEV SECRET
// const COS_AUTH_ENDPOINT = mySecrets.COS_AUTH_ENDPOINT;                  // DEV SECRET
// const COS_BUCKET_NAME = mySecrets.COS_BUCKET_NAME;                      // DEV SECRET
// const COS_ENDPOINT = mySecrets.COS_ENDPOINT;                            // DEV SECRET
// const COS_SERVICE_CRN = mySecrets.COS_SERVICE_CRN;                      // DEV SECRET
// const COS_SIGNATURE_VERSION = mySecrets.COS_SIGNATURE_VERSION;          // DEV SECRET
// const STRIPE_KEY = mySecrets.STRIPE_KEY;                                // DEV SECRET
const COS_API_KEY = process.env.COS_API_KEY;                            // PRODUCTION SECRET
const COS_AUTH_ENDPOINT = process.env.COS_AUTH_ENDPOINT;                // PRODUCTION SECRET
const COS_BUCKET_NAME = process.env.COS_BUCKET_NAME;                    // PRODUCTION SECRET
const COS_ENDPOINT = process.env.COS_ENDPOINT;                          // PRODUCTION SECRET
const COS_SERVICE_CRN = process.env.COS_SERVICE_CRN;                    // PRODUCTION SECRET
const COS_SIGNATURE_VERSION = process.env.COS_SIGNATURE_VERSION;        // PRODUCTION SECRET
const STRIPE_KEY = process.env.STRIPE_KEY;                              // PRODUCTION SECRET


// IBM COS CONFIG .................................................................................
const cosConfig = {
    endpoint: COS_ENDPOINT,                         // bucket public endpoint
    apiKeyId: COS_API_KEY,                          // <apikey>
    serviceInstanceId: COS_SERVICE_CRN,             // <resource_instance_id>
    // ibmAuthEndpoint: COS_AUTH_ENDPOINT,             // a fixed String
    // signatureVersion: COS_SIGNATURE_VERSION         // a fixed String
}
const COS = new ibm.S3(cosConfig);
// GET imageData ..................................................................................
const getImageBytes = key => COS.getObject({Bucket: COS_BUCKET_NAME, Key: key}).promise();
// GET ALL Product IMAGE ..........................................................................
const getImagesFromS3 = async (prods) => {
    for (const p of prods) {
        await getImageBytes(p.imageUrl)     // imageUrl or Image Name or Key to search S3 Bucket
            .then( data => {
                p.imageUrl = "data:image/jpg;base64," + Buffer.from(data.Body).toString('base64');
                console.log('fixed imageURL for:' + p.title);
            })
            .catch( e => console.log(`\nERROR: ${e.code} - ${e.message}\n`) )
        ;
    }
    return prods;
};
// GET ONE Product IMAGE ..........................................................................
const getImageFromS3 = async (prod) => {
    await getImageBytes(prod.imageUrl)     // imageUrl or Image Name or Key to search S3 Bucket
        .then( data => {
            prod.imageUrl = "data:image/jpg;base64," + Buffer.from(data.Body).toString('base64');
            console.log('got all details for:' + prod.title);
        })
        .catch( e => console.log(`\nERROR: ${e.code} - ${e.message}\n`) )
        ;
    return prod;
};


// Set STRIPE .....................................................................................
const stripe = require('stripe')(STRIPE_KEY);

const Product = require('../models/products');
const Order = require('../models/order');

// ITEMS PER PAGE .................................................................................
const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
    const page = Number(req.query.page) || 1;
    let totalItems;

    Product.find()
        .countDocuments()
        .then( numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip( (page - 1) * ITEMS_PER_PAGE )
                .limit(ITEMS_PER_PAGE)
            ;
        } )
        .then( products => {

            // IBM COS change done to fix imageURL for each product
            getImagesFromS3(products)
                .then( products => {
                    res.render('shop/product-list', {
                        prods: products,
                        pageTitle: 'All Products',
                        path: '/products',
        
                        totalProducts: totalItems,
                        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                        hasPreviousPage: page > 1,
                        currentPage: page,
                        nextPage: page + 1,
                        previousPage: page - 1,
                        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        
                    });
        
                } )
                .catch( e => console.log(`\nERROR: ${e.code} - ${e.message}\n`));
            ;
            // res.render('shop/product-list', {
            //     prods: products,
            //     pageTitle: 'All Products',
            //     path: '/products',

            //     totalProducts: totalItems,
            //     hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            //     hasPreviousPage: page > 1,
            //     currentPage: page,
            //     nextPage: page + 1,
            //     previousPage: page - 1,
            //     lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)

            // });
        } )
        .catch( err => { 
            console.log("Error..."); 
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        } )
    ;
};


exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then( product => {

            // IBM COS change done to fix imageURL
            getImageFromS3(product)
                .then( product => {
                    res.render('shop/product-detail', {
                        product: product, 
                        pageTitle: product.title,
                        path: '/products'
                    });
        
                })
                .catch( e => console.log('ERR at get single product.') )
            ;
            // res.render('shop/product-detail', {
            //     product: product, 
            //     pageTitle: product.title,
            //     path: '/products'
            // });
        } )
        .catch( err => {
            console.log("Error...");
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        } )
    ;
};


exports.getIndex = (req, res, next) => {
    
    const page = Number(req.query.page) || 1;
    let totalItems;

    Product.find()
        .countDocuments()
        .then( numProducts => {
            totalItems = numProducts;
            return Product.find()
                .skip( (page - 1) * ITEMS_PER_PAGE )
                .limit(ITEMS_PER_PAGE)
                    
            ;
        } )
        .then( products => {
            // IBM COS change done to fix imageUrl for each products
            getImagesFromS3( products )
                .then( products => {
                    res.render('shop/index', {
                        prods: products,
                        pageTitle: 'Shop',
                        path: '/',
        
                        totalProducts: totalItems,
                        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                        hasPreviousPage: page > 1,
                        currentPage: page,
                        nextPage: page + 1,
                        previousPage: page - 1,
                        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
        
                    });
                } )
                .catch( e => console.log('Error at getIndex') )
            ;
            // res.render('shop/index', {
            //     prods: products,
            //     pageTitle: 'Shop',
            //     path: '/',

            //     totalProducts: totalItems,
            //     hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            //     hasPreviousPage: page > 1,
            //     currentPage: page,
            //     nextPage: page + 1,
            //     previousPage: page - 1,
            //     lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)

            // });
        } )
        .catch( err => { 
            console.log("Error..."); 
            console.log(err); 
        } )
    ;
};

exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then( user => {
            const products = user.cart.items;
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products
            });
        } )
        .catch( err => { 
            console.log("Error..."); 
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        } )
    ;

};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then( product => {
            return req.user.addToCart(product);
        } )
        .then( result => {
            res.redirect('/cart');
        } )
        .catch( err => {
            console.log("Error...");
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        } )
    ;
};


exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then( result => res.redirect('/cart') )
        .catch( err => { 
            console.log("Error..."); 
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        } )
    ;
};

exports.getOrders = (req, res, next) => {
    Order.find({ 'user.userId': req.user._id })
        .then( orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders
            });
        } )
        .catch( err => { 
            console.log("Error..."); 
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        } )
    ;

};

exports.postOrder = ( req, res, next ) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then( user => {
            const products = user.cart.items.map( i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } }
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        } )
        .then( result => {
            return req.user.clearCart();
        } )
        .then( () => {
            res.redirect('/orders');
        } )
        .catch( err => { 
            console.log("Error creating order..."); 
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        } )
    ;
};


exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;

    Order.findById(orderId)
        .then( order => {
            if(!order) {
                return next( new Error('No orders found...') );
            }
            if( order.user.userId.toString() !== req.user._id.toString() ) {
                return next( new Error('Unauthorized') );
            }

            //------------------------------------------------------------------------
            // Workaround because I don't want to store invoices on my machine/server

            const invoiceName = 'invoice-' + orderId + '.pdf';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; fileName="' + invoiceName + '"' );
            pdfDoc = new PDFDocument();
            pdfDoc.pipe(res);

            // const invoiceName = 'invoice-' + orderId + '.pdf';
            // const invoicePath = path.join('data', 'invoices', invoiceName);

            // res.setHeader('Content-Type', 'application/pdf');
            // res.setHeader('Content-Disposition', 'inline; fileName="' + invoiceName + '"' );

            // pdfDoc = new PDFDocument();
            // pdfDoc.pipe(fs.createWriteStream(invoicePath));
            // pdfDoc.pipe(res);
            //------------------------------------------------------------------------

            pdfDoc.fontSize(26).text('Invoice', { underline: true } );

            let totalPrice = 0;
            order.products.forEach( prod => {
                totalPrice += prod.quantity * prod.product.price;
                pdfDoc.fontSize(14).text( prod.product.title + '--   ' + prod.quantity + ' X ' + '$' + prod.product.price );
            } );

            pdfDoc.text('-----------------------------------------');
            pdfDoc.fontSize(26).text("Total Price:  $" + totalPrice);

            pdfDoc.end();

        } )
        .catch( err => next(err) )
    ;

};



exports.getCheckout = (req, res, next) => {
    let products;
    let total = 0;
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then( user => {
            products = user.cart.items;
            total = 0;

            products.forEach( p => {
                total += p.quantity * p.productId.price;
            });

            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: products.map( p => {
                    return {
                        name: p.productId.title,
                        description: p.productId.description,
                        amount: p.productId.price * 100,
                        currency: 'inr',
                        quantity: p.quantity
                    };
                }),
                mode: 'payment',
                success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel',
            });
        } )
        .then( session => {
            res.render('shop/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                products: products,
                totalPrice: parseFloat(total).toFixed(2),
                sessionId: session.id
            });
        } )
        .catch( err => { 
            console.log("STRIPE ===> ERROR"); 
            console.log(err); 
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        } )
    ;

};





exports.getCheckoutSuccess = ( req, res, next ) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then( user => {
            const products = user.cart.items.map( i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } }
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        } )
        .then( result => {
            return req.user.clearCart();
        } )
        .then( () => {
            res.redirect('/orders');
        } )
        .catch( err => { 
            console.log("Error creating order..."); 
            const error = new Error(err);
            error.httpStstusCode = 500;
            return next(error);
        } )
    ;
};
