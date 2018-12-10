var db = require("../models");
var expressValidator = require("express-validator");
var bcrypt = require('bcrypt');
var saltRounds = 10;
var passport = require('passport');

module.exports = function (app) {

  //index page
  // Load index page
  // app.get("/", function (req, res) {

  //   let userId = checkForMultipleUsers(req);

  //   console.log("anything")
  //   if (req.isAuthenticated()) {
  //     console.log(userId)
  //     db.Users.findOne({
  //       where: {
  //         id: userId
  //       },
  //       include: [{
  //         model: db.SubbedSubspeaks,
  //         where: {
  //           UserId: userId
  //         },
  //         required: false
  //       }]
  //     }).then((userInfo) => {


  //       console.log("USERINFO: " + JSON.stringify(userInfo));

  //       res.render("index", {
  //         user: req.isAuthenticated(),
  //         username: userInfo.user_name,
  //         subspeaks: userInfo.SubbedSubspeaks
  //       });

  //     });
  //   } else {

  //     //testing to see if we're logged in 
  //     res.render("index", {
  //       user: req.isAuthenticated(),
  //     });
  //   }
  // });

  app.get("/api/checkLogin", (req, res) => {
    let userId = checkForMultipleUsers(req);
    let userObj = {}
    if (req.isAuthenticated()) {

      db.Users.findOne({
        where: {
          id: userId
        },
        include: [{
          model: db.SubbedSubspeaks,
          where: {
            UserId: userId
          },
          required: false
        }]
      }).then((userInfo) => {


        console.log("USERINFO: " + JSON.stringify(userInfo));

        userObj = {
          id: userId,
          username: userInfo.user_name,
          subspeaks: userInfo.SubbedSubspeaks,
          logged: true
        }

        res.json(userObj)
      });
    } else {
      userObj = {
        id: "",
        username: "",
        subspeaks: "",
        logged: false
      }
      res.json(userObj)
    }

  })


  //login user
  app.post("/api/login", passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/',

  }));

  // Create a new user
  app.post("/api/register", function (req, res) {
    //check the fields make sur they're not empty

    req.checkBody('username', 'Username cannot be empty.').notEmpty();
    req.checkBody('email', 'Email field must not be empty.').notEmpty();
    req.checkBody('email', 'Email field must be and email.').isEmail();
    req.checkBody('password', 'Password must be 8 characters long.').len(8, 100);
    req.checkBody('passwordMatch', 'Password must be 8 characters long.').len(8, 100);
    req.checkBody('passwordMatch', 'Password must be 8 characters long.').equals(req.body.password);

    var errors = req.validationErrors();

    //if there are errors display them on screen 
    if (errors) {
      console.log(`errors: ${JSON.stringify(errors)}`)

      res.render('register', {
        title: "Register",
        errors: errors
      });
    } else {
      //hash the password 
      var salt = bcrypt.genSaltSync(saltRounds);
      var hash = bcrypt.hashSync(req.body.password, salt);
      //bcrypt the password then insert
      console.log('hello')
      db.Users.findOrCreate({
        where: {
          user_name: req.body.username
        },
        defaults: {
          user_name: req.body.username,
          user_email: req.body.email,
          password: hash
        }
      }).spread((user, created) => {
        //read about spread at http://docs.sequelizejs.com/manual/tutorial/models-usage.html
        console.log(`created: ${created}`)
        console.log(`user ${JSON.stringify(user.id)}`);
        if (created === false) {
          res.render("register", {
            title: "That Username already exists"
          });
        } else {
          const user_id = JSON.stringify(user.id);
          //login the newly added user automatically using passport req.login is passport thing
          req.login(user_id, (err) => {
            res.redirect('/');
          })
        }
      })
    }
  });

  app.post("/api/createPost", function (req, res) {
    let userId = checkForMultipleUsers(req);

    db.Subspeaks.findOne({
      where: {
        name: req.body.subspeakName
      }
    }).then((result) => {
      console.log("Results: " + result.id, "Title: " + req.body.title)
      db.Post.create({
  
        defaults: {
          post_text: req.body.text,
          title: req.body.title,
          SubspeakId: result.id,
          UserId: userId
        }
      }).spread((results, created) => {
        console.log(created)
      })
    })

  });

  //load a subspeak 
  app.get("/s/:subspeak", function (req, res) {
    let userId = checkForMultipleUsers(req);
    db.Subspeaks.findOne({
      where: {
        name: req.params.subspeak
      },
      include: [{
        model: db.SubbedSubspeaks,
        where: {
          UserId: userId
        },
        required: false
      }]
    }).then((result) => {
      console.log("Load Subspeak: " + JSON.stringify(result.SubbedSubspeaks))
      if (result) {
        if (result.SubbedSubspeaks.length === 0) {
          res.render("subspeaks", {
            subspeakName: result.name,
            subspeakId: result.id,
            subspeakDescription: result.description,
            subscribed: false
          })
        } else {

          for (let i = 0; i < result.SubbedSubspeaks.length; i++) {
            if (result.SubbedSubspeaks[i].SubspeakId === result.id) {
              res.render("subspeaks", {
                subspeakName: result.name,
                subspeakId: result.id,
                subspeakDescription: result.description,
                subscribed: true
              })
              return;
            }
          }
        }
      } else {

        res.render("subspeaks", {

        })
      }
    })
  });
  //get the users subscriptions
  app.get("/api/subscribe", function (req, res) {
    let userId = checkForMultipleUsers(req);

    db.SubbedSubspeaks.findAll({
      where: {
        UserId: userId
      }
    }).then((userSubs) => {


      console.log("USERINFO: " + JSON.stringify(userSubs));

      res.json(userSubs)
    })
  });
  //subscribe the logged in user to a subspeak
  app.post("/api/subscribe", function (req, res) {
    let userId = checkForMultipleUsers(req);
    console.log(req.body)
    //create a new sub
    db.SubbedSubspeaks.create({
      subspeak_name: req.body.name,
      subspeak_description: req.body.description,
      SubspeakId: req.body.subspeakId,
      UserId: userId
    }).then(result => {
      res.redirect(`/s/${req.body.name}`)

    })

  })

  //unsubscribe a user from the subspeak
  app.delete("/api/subscribe/:id/:name", function (req, res) {
    let userId = checkForMultipleUsers(req);
    db.SubbedSubspeaks.destroy({
      where: {
        SubspeakId: req.params.id,
        UserId: userId
      }
    }).then(result => {
      console.log(`DESTROY : ${JSON.stringify(result)}`)
      res.redirect(`/s/${req.params.name}`)

    })
  })
  //get all data from client js file
  app.post("/api/subspeaks", function (req, res) {
    console.log(req.body)

    let userId = checkForMultipleUsers(req);

    db.Subspeaks.findOrCreate({

      where: {
        name: req.body.name
      },
      defaults: {
        name: req.body.name,
        description: req.body.description,
        views: req.body.views,
        numberofsubs: req.body.numberofsubs,
        icon: req.body.icon,
        createdBy: userId
      }
    }).spread((results, created) => {
      console.log(`Created Subspeak : ${created}`)
      if (created === false) {
        res.render("index", {

          warnings: "That Subspeak already exists"
        })
      } else {
        res.render("index", {
          warnings: "Subspeak created"
        })

        //automatically subscibe the user to their subspeak 
        db.SubbedSubspeaks.create({
          subspeak_name: results.name,
          subspeak_description: results.description,
          SubspeakId: results.id,
          UserId: userId
        })
      }
    })
  })

  app.post("/s/posts", function (req, res) {
    db.Post.create({
      post_text: 'foo',
      tags: 'bar',
      categories: '',
      views: 5,
      title: '',
    }).then(task => {
      // you can now access the newly created task via the variable task
    })
  })

  //this route is not working
  app.post("/s/comments", function (req, res) {
    db.Comments.create({
      comments: 'foo',
      voting: 'bar',
    }).then(task => {
      // you can now access the newly created task via the variable task
    })
  })

  // Delete an example by id
  app.delete("/api/examples/:id", function (req, res) {
    db.Example.destroy({
      where: {
        id: req.params.id
      }
    }).then(function (
      dbExample
    ) {
      res.json(dbExample);
    });
  });



};

function checkForMultipleUsers(req) {
  let userId;

  //check if req.user is an object, if there are multiple users in a table than it is, if there's one than it's not
  if (typeof req.user !== 'object') {
    console.log('not an object')
    return userId = req.user
  } else {
    return userId = req.user.id
  }
}

//req.login uses these functions 
passport.serializeUser(function (user_id, done) {
  done(null, user_id)
})
//this gets the users info
passport.deserializeUser(function (user_id, done) {
  done(null, user_id);
});