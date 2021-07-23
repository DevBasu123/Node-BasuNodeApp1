const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const userSchema = new Schema({
    email: { type: String, required: true },
    password: {type: String, required: true },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: { items: 
        [{
            productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true}, 
            quantity: {type: Number, required: true}
        }]
    }
});

userSchema.methods.addToCart = function(product) {
    console.log("At 'User' model, 'addToCart' function...");
    let newQuantity = 1;
    const updatedCartItems = [ ...this.cart.items ];
    
    // Check if Product already exists in Cart
    console.log("Check if existing");
    const cartProductIndex = this.cart.items.findIndex( 
        cp => { return  cp.productId.toString() === product._id.toString() ; } 
    );

    // If Product already exists, Increase quantity
    if( cartProductIndex >= 0 ) {
        console.log("Already exists, increasing quantity");
        newQuantity = this.cart.items[cartProductIndex].quantity + 1;
        updatedCartItems[cartProductIndex].quantity = newQuantity;
    }
    else {
        console.log("Newly added");
        updatedCartItems.push(
            { 
                productId: product._id, 
                quantity: newQuantity 
            }
        );
    }
    const updatedCart = { items: updatedCartItems };

    this.cart = updatedCart;
    return this.save();

};


userSchema.methods.removeFromCart = function(productId) {
    const updatedCartItems = this.cart.items.filter( item => {
        return item.productId.toString() !== productId.toString();
    } );

    this.cart.items = updatedCartItems;
    return this.save();
};


userSchema.methods.clearCart = function() {
    this.cart = { items: [] };
    return this.save();
};


module.exports = mongoose.model('User', userSchema);

