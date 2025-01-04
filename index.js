const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const path = require("path");
const cors = require("cors");  
const { type } = require("os");
const { error } = require("console");
const request = require('request');
const axios = require('axios');
const bodyParser = require('body-parser');

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
//Database Connection with mongodb

mongoose.connect("mongodb+srv://manojshrestha2081:Manoj12345@cluster0.vfwf0.mongodb.net/e-commerce");

//API creation
app.get("/", (req, res)=>{
    res.send("Express app is running ");

})


//Image storage 

const storage = multer.diskStorage({
    destination: './upload/Images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

//creating upload endpoint images 
app.use('/images', express.static('upload/images'))
app.post('/upload', upload.single('product'), (req, res)=>{
    res.json({
        success: 1,
        image_url : `http://localhost:${port}/images/${req.file.filename}`
    })

})


//Schema for creating Products 
const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required: true 
    },
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true 
    },
    new_price:{
        type: Number,
        required: true
    },
    old_price:{
        type: Number,
        required: true
    },
    date:{
        type: Date,
        default:Date.now,
    },
    available:{
        type: Boolean,
        default:true
    }
})
app.post('/addproduct', async (req, res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }else{
        id = 1;
    }
    const product = new Product({
        id:id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,

    });
    console.log(product);
    await product.save();
    console.log("Saved");

    res.json({
        success: true,
        name: req.body.name
    })
})



//Creating API for deleting Products
app.post('/removeproduct', async (req, res)=>{
    await Product.findOneAndDelete({id:req.body.id})
    console.log("Romoved ");

    res.json({
        success: true,
        name: req.body.name

    })

})


//Creating API for getting all proucts 

app.get('/allproducts', async (req, res)=>{
    let products = await  Product.find({});
    console.log("All products fetched ");

    res.send(products);
})


//sehema creating for user model 
const Users = mongoose.model('Users', {
    name:{
        type:String,
        
    },
    email:{
        type:String,
        unique:true
    },
    password:{
        type: String
    },
    cartData:{
        type:Object
    },
    date:{
        type:Date,
        default: Date.now,
    }
})


//Creating end point for  reginster the user

app.post('/signup', async (req, res)=>{
    let check = await Users.findOne({email:req.body.email})
    if(check){
        return res.status(400).json({
            success: false,
            error:"Existing user foumd with same email address"
        })
    }
    let cart = {};
    for(let i = 0; i<300; i++){
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.name,
        email: req.body.email,
        password: req.body.password,
        cartData: cart
    })
    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }
    const token = jwt.sign(data,'secret_ecom');
    res.json({
        success:true, token
    })

})

//User login

app.post('/login', async(req, res)=>{
    let user = await Users.findOne({email:req.body.email})
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id,
                }
            }
            const token = jwt.sign(data, 'secret_ecom')

            res.json({
                success:true, token
            })
        }
        else{
            res.json({success:false, errors: "wrong password"})
        }
    }
    else{
        res.json({
            success:false,
            errors: "Wrong email id "
        })
    }
})

//creating endpoint for newCollection data 


app.get('/newcollection', async(req, res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);

    console.log("new collection fetched ");
    res.send(newcollection)
})


app.get('/popular', async (req, res)=>{
    let products = await  Product.find({category:"women"})
    let popularInWomen = products.slice(0,4)
    console.log("Popular in women fetched");

    res.send(popularInWomen)



})

//creating middleware to fetch user 
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
      return res.status(401).send({
        errors: "Please authenticate using a valid token"
      });
    }
  
    try {
      const data = jwt.verify(token, 'secret_ecom');
      req.user = data.user; // Add user data to the request object
      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      return res.status(401).send({
        errors: "Please authenticate using a valid token"
      });
    }
  };
  
  // Creating an endpoint for adding products to the cart data
  app.post('/addtocart', fetchUser, async (req, res) => {
    //console.log(req.body, req.user);
    // Your logic for adding products to the cart can go here
    //res.status(200).send({ message: "Product added to cart" });
    console.log("added", req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId]+=1;
    await Users.findOneAndUpdate({_id:req.user.id,}, {cartData: userData.cartData})
    res.send({message: "added"});
  });
  

//creating endpoint to remove product from cartdata

app.post('/removefromcart', fetchUser, async(req, res)=>{
    console.log("removed", req.body.itemId)
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0){
        userData.cartData[req.body.itemId]-=1;
    }
   
    await Users.findOneAndUpdate({_id:req.user.id,}, {cartData: userData.cartData})
    res.send({message: "Removed"});


})

//creating end point to get cart data 
app.post('/getcart', fetchUser, async (req, res)=>{
    console.log("getCart ");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})


//payment backend 
const KHALTI_SECRET_KEY = 'live_secret_key_68791341fdd94846a146f0457ff7b455';

// Endpoint to initiate payment
app.post('/payment', async (req, res) => {
  // Get necessary details from the request body
  const { amount, purchase_order_id, purchase_order_name, customer_info } = req.body;

  // Validate input
  if (!amount || !purchase_order_id || !purchase_order_name || !customer_info) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Set up the request data for Khalti payment initiation
  const options = {
    method: 'POST',
    url: 'https://a.khalti.com/api/v2/epayment/initiate/',
    headers: {
      Authorization: `Key ${KHALTI_SECRET_KEY}`, // Use your Khalti secret key
      'Content-Type': 'application/json',
    },
    data: {
      return_url: 'http://example.com/', // URL to redirect after payment
      website_url: 'http://localhost:3001/', // Your website URL
      amount: amount, // Amount in paisa
      purchase_order_id: purchase_order_id,
      purchase_order_name: purchase_order_name,
      customer_info: customer_info,
    },
  };

  try {
    // Send request to Khalti API
    const response = await axios(options);
    
    // Send the response back to the client
    res.status(200).json({
      message: 'Payment initiation successful',
      data: response.data,
    });
  } catch (error) {
    // Handle errors
    console.error('Error initiating payment:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to initiate payment',
      details: error.response?.data || error.message,
    });
  }
});



//fetch orders 
app.get('/orders', fetchUser, async (req, res) => {
    try {
        // Fetch orders for the logged-in user
        const orders = await Order.find({ userId: req.user.id }); // Assuming `Order` is the existing model/schema

        if (!orders || orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No orders found for this user",
            });
        }

        res.status(200).json({
            success: true,
            orders,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching orders',
            error: error.message,
        });
    }
});





 




app.listen(port,(error)=>{
    if(!error){
        console.log("Server is running on port "+port);
    }
    else{
        console.log("Error: " +error);
    }

})




