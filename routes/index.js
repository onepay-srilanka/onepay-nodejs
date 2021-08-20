var express = require('express');
var router = express.Router();
var fs = require('fs');
const request = require('request');
var crypto = require('crypto');

var Cart = require('../models/cart');
var products = JSON.parse(fs.readFileSync('./data/products.json', 'utf8'));

//MARK: onepay payment gateway values 

//MARK: payment base url
var paymentUrl = 'https://merchant-api-development.onepay.lk/api/ipg/gateway/request-transaction/?hash=' 

//MARK: Please access onepay merchant admin panel to get this values 
var appId      = 'SA571187AEE1C0D48C9A0'
var appToken   = 'c61e77584884b069cce64e3fb6c3ca5d524b1b2042a735bef225e129741a45928302c76d934a2170.G7WJ1187AEE1C0D48C9F7'
var salt       = '58211187AEE1C0D48C9CE'
var transactionRedirectUrl = 'http://localhost:3000/response'

//MARK: Index Route
router.get('/', function (req, res, next) {
  res.render('index', 
  { 
    title: 'onepay shopping cart',
    products: products
  }
  );
});

//MARK: Add New Item Route
router.get('/add/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});
  var product = products.filter(function(item) {
    return item.id == productId;
  });
  cart.add(product[0], productId);
  req.session.cart = cart;
  res.redirect('/');
});

//MARK: Add Cart Route
router.get('/cart', function(req, res, next) {
  if (!req.session.cart) {
    return res.render('cart', {
      products: null
    });
  }
  var cart = new Cart(req.session.cart);
  res.render('cart', {
    title: 'onepay shopping cart',
    products: cart.getItems(),
    totalPrice: cart.totalPrice
  });
});

//MARK: Remove Item Form Cart Route
router.get('/remove/:id', function(req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.remove(productId);
  req.session.cart = cart;
  res.redirect('/cart');
});

//MARK: Payment Route
router.post('/pay', function(req, res, next) {
  
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  //MARK: Remove all empty space when make json
  var data = JSON.stringify({
                      "amount":cart.totalPrice,  //only alow LKR amouts
                      "app_id":appId,
                      "reference":"5888995555546656925", //enter uniq number
                      "customer_first_name":req.body.fname,
                      "customer_last_name":req.body.lname,
                      "customer_phone_number": req.body.phonenumber, //please enter number with +94
                      "customer_email":req.body.email,
                      "transaction_redirect_url":transactionRedirectUrl  
                    })
  
  var hash = crypto.createHash('sha256');
  hash_obj = data + salt //MARK: append slat to the json when make hash obj
  hash_obj = hash.update(hash_obj, 'utf-8');
  gen_hash= hash_obj.digest('hex');

  //MARK: Make trasaction Request 
  var options = {
    'method': 'GET',
    'url': paymentUrl + gen_hash,
    'headers': {
      'Authorization': appToken,
      'Content-Type': 'application/json'
    },
    body: data
  };

  request(options, function (error, response) {
    if (error) {
      res.sendStatus(400)
      res.end();

    } else {
      
      const json_data = JSON.parse(response.body)

      //MARK: status == 1000 is success 
      if (json_data.status == 1000) 
       {
        
        res.redirect(json_data.data.gateway.redirect_url)
        res.end();

       } else {

        res.render(json_data.message)
        res.end();
       }
      
    }
  });
  
});

router.get('/response', function(req, res, next) {
  
  if (res.body) {
    //Failed transaction
    console.log(res.body)
    res.sendStatus(400)

  } else {
    //Success transaction 
    console.log()
    res.sendStatus(200)

  }
});

module.exports = router;
