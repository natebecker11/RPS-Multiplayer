// var for the database
var database = firebase.database();
// var for the auth
var fAuth = firebase.auth();

// var for the ref to track connections
var activeUsersRef = database.ref('/connections/');
// var for tracking connection changes
var connectedRef = database.ref('.info/connected');

// flag for whether the user's name is being displayed
var nameDisplayed = false;




// function to abbreviate document.queryselector
var docQS = function(element) {
  return document.querySelector(element)
}



// Returns the signed-in user's display name.
function getUserName() {
  return fAuth.currentUser.displayName;
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
  return !!fAuth.currentUser;
}

// listener for when a user connects
connectedRef.on('value', function(snap) {

  if (snap.val()) {
    // add the user to the connections list
    var userConnected = activeUsersRef.push(true);
    // remove from the listwhen they disconnect
    userConnected.onDisconnect().remove();
  }
})


// listener for when the connections list changes
// activeUsersRef.on('value', function(snap) {
//   console.log(snap.val())
// })






// fAuth listener for login status change
fAuth.onAuthStateChanged(function(user) {  
  if (user) {    
    if (!nameDisplayed) {
      console.log('displaying user name')
      document.querySelector('#userName').textContent = fAuth.currentUser.displayName;
    }    
    // document.querySelector('#userName').textContent = database.ref('/' + user.uid + '/').displayName;
    document.querySelector('#loginScreen').classList.add('hidden');
    document.querySelector('#waitScreen').classList.remove('hidden');
  } else {
    console.log('signed out')
  }
}, function(error) {
  console.log(error);
}, function() {
  console.log('its over now')
})




// function to send the user into an active game



// function to check whether there is room for a user
var gameReadyCheck = function() {
  database.ref('/currentGame/').once('value').then(function(snap) {
    var current = snap.val();
    var uid = fAuth.currentUser.uid;
    var name = fAuth.currentUser.displayName;
    var updateStat = function(message) {
      docQS('#statusDisplay').textContent = message;
    }
    console.log(snap.val());
    // if game already has 2 users
    if (current.user1 && current.user2) {
      // function to tell the user to wait
      console.log('Not enough room!')
      updateStat('Game Is Full! You Can Try Again Soon!');
    // if game has only 1 player
    } else if (current.user1) {
      // function to add user as user2
      console.log('you are in, get ready to play!')
      // create a new ref and store the userID and name within
      database.ref('/currentGame/user2/').set({
        userID: uid,
        displayName: name
      })
      updateStat('You Are In! Get Ready To Play!')
    // if game has no players
    } else {
      // function to add user as user1
      console.log('you are in, searching for opponent!')
      // create a new ref and set the userid and name within
      database.ref('/currentGame/user1/').set({
        userID: uid,
        displayName: name
      })
      // update the status of the user on their screen
      updateStat('You Are In! Searching For Opponent!');
    }
  })
}


// function to send the user's choice to the server
var chooseRPS = function(choice) {
  var user = authUserNum() || 'notAUser'
  
  database.ref('/currentGame/' + user + '/choice/').set({
    choice: choice
  })
  database.ref('/currentGame/choices/').push({
    chosen: 'yes'
  })
}

// function to authenticate which user a user is
var authUserNum = function() {
  var currentID = fAuth.currentUser.uid;
  var userNumber;
  var currentGame = database.ref('/currentGame/');
  currentGame.once('value', function(snap) {
    for (var user in snap.val()) {
      // console.log(snap.val()[user]['userID']);
      if (snap.val()[user]['userID'] === currentID) {
        return userNumber = user;
      }
    } 
  })
  return userNumber;
}

// function to check whether both choices have been entered

// function to evaluate a winner
var evalWinner = function() {
  // function to get the choice for a user
  var getChoice = function(user) {
    var choice;
    database.ref('/currentGame/' + user + '/choice/').once('value', function(snap) {
      // console.log(snap.val()['choice']);
      return choice = snap.val()['choice'];
    })
    return choice;
  }
  // bind the choice of each user  
  var user1Choice = getChoice('user1');
  var user2Choice = getChoice('user2');
  // console.log('user1 chose: ' + user1Choice + ' user 2 chose: ' + user2Choice)
  // RPS functionality
  var playRPS = function(choice1, choice2) {
    if (choice1 === choice2) {return 'tie'}
    // array for resolving gameplay
    var gameArray = ['paper', 'scissors', 'rock']
    if (choice1 === 'rock' && choice2 === 'paper') {return 'user2'}
    if (gameArray.indexOf(choice1) < gameArray.indexOf(choice2)) {return 'user2'}
    else return 'user1';
  }
  return playRPS(user1Choice, user2Choice)
}

// function to tally a win/loss/draw

// function to 






// listener for the currentGame ref
database.ref('/currentGame/').on('value', function(snap) {
  var current = snap.val();
  if (current.user1 && current.user2) {
    // launch the game
    console.log('the game begins')
  }
})

// database listener for gameplay
database.ref('/currentGame/choices/').on('value', function(snap) {
  // bind the current user
  var player = authUserNum();
  // check if it's user1. We only want to evaluate the user choices once, so we only do this for user1, not user1/user2
  if (player !== 'user1') return;
  // if both players have made a choice  
  if (Object.keys(snap.val()).length === 2) {
    // run the rps eval function
  }
})

// listener for Start Game button
document.querySelector('#startBtn').onclick = function() {gameReadyCheck()}

// listener for the Login button
document.querySelector('#loginButton').onclick = function(event) {
  // prevent page reload on click
  event.preventDefault();
  // var for entered username
  var userDisplayName = document.querySelector('#loginText').value;
  
  // if a value is entered
  if (userDisplayName) {
    // display the user's name 
    document.querySelector('#userName').textContent = userDisplayName;
    // flag that the name is displayed
    nameDisplayed = true;
    // run the firebase anon auth method
    fAuth.signInAnonymously().then(function(snap) {
        var uid = snap.user.uid;        
        // on the database
        database.ref('/' + uid + '/info/').set({
            displayName: userDisplayName,
            userID: uid
          })
        fAuth.currentUser.updateProfile({
          displayName: userDisplayName
        })
      })
      // catch errors
      .catch(function(error) {      
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode + errorMessage);
    })
  } else {
    alert('Please enter a name!')
  }
}


// listener for the gameplay buttons
var gameplayBtns = document.querySelectorAll('.gameplayBtn')
gameplayBtns.forEach(function(element) {
  element.addEventListener('click', function(event) {
    chooseRPS(this.textContent.toLowerCase())
  })
})



// // User data location
// var currentUser = firebase.auth().currentUser

