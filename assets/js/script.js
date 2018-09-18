
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

// var for current connection key
var curConnectKey = '';

// var for whether a RPS has been chosen
var rpsChosen = false;



// function to abbreviate document.queryselector
var docQS = function(element) {
  return document.querySelector(element)
}

// function to capitalize the first letter of a string
var toCaps = function(string) {
  return string.charAt(0).toUpperCase() + string.slice(1); 
}

// function to reset the text content of any number of elements
var resetText = function(...args) {
  args.forEach(function(element) {
    docQS('#' + element).textContent = ''
  })
}





// function to check whether there is room for a user
var gameReadyCheck = function() {
  database.ref('/currentGame/').once('value').then(function(snap) {
    // bind the DB return
    var current = snap.val();
    // bind the current user's auth info
    var uid = fAuth.currentUser.uid;
    var name = fAuth.currentUser.displayName;
    // function to display text in the update box
    var updateStat = function(message) {
      docQS('#statusDisplay').textContent = message;
    }    
    // if game already has 2 users
    if (current.user1 && current.user2) {      
      updateStat('Game Is Full! You Can Try Again Soon!');
    // if game has only 1 player
    } else if (current.user1) {      
      // create a new ref and store the userID and name within
      database.ref('/currentGame/user2/').set({
        userID: uid,
        displayName: name,
        key: curConnectKey
      })
      updateStat('You Are In! Get Ready To Play!')
      docQS('#startBtn').disabled = true;
    // if game has no players
    } else {      
      // create a new ref and set the userid and name within
      database.ref('/currentGame/user1/').set({
        userID: uid,
        displayName: name,
        key: curConnectKey
      })
      // update the status of the user on their screen
      updateStat('You Are In! Searching For Opponent!');
      docQS('#startBtn').disabled = true;
    }
  })
}

// function to send the user's choice to the server
var chooseRPS = function(choice) {
  // define if the current user is user1 or user2
  var user = authUserNum() || 'notAUser'
  // set their choice on the DB in their ref
  database.ref('/currentGame/' + user + '/choice/').set({
    choice: choice
  })
  // flag that a choice has been made
  database.ref('/currentGame/choices/').push({
    chosen: 'yes'
  })
}

// function to authenticate which user a user is
var authUserNum = function() {
  // grab active user's uid
  var currentID = fAuth.currentUser.uid;
  var userNumber;
  var currentGame = database.ref('/currentGame/');
  // grab a snap of the current game ref
  currentGame.once('value', function(snap) {
    // for every user in the current game ref
    for (var user in snap.val()) {
      // if that user id matches the active user it      
      if (snap.val()[user]['userID'] === currentID) {
        // we identified the user, so return the user number
        return userNumber = user;
      }
    } 
  })
  return userNumber;
}

// function to evaluate a winner
var evalWinner = function() {
  // function to get the choice for a user
  var getChoice = function(user) {
    var choice;
    // grab a snap of the ref containing th echoice
    database.ref('/currentGame/' + user + '/choice/').once('value', function(snap) {
      // return the choice
      return choice = snap.val()['choice'];
    })
    return choice;
  }
  // bind the choice of each user  
  var user1Choice = getChoice('user1');
  var user2Choice = getChoice('user2');
  // display the user choices on screen  
  docQS('#user1Choice').classList.remove('hidden');
  docQS('#user1Choice').textContent = 'Last Choice: ' + toCaps(user1Choice);
  docQS("#user2Choice").classList.remove('hidden');
  docQS("#user2Choice").textContent = 'Last Choice: ' + toCaps(user2Choice);
  // RPS functionality
  var playRPS = function(choice1, choice2) {
    if (choice1 === choice2) {return 'ties'}
    // array for resolving gameplay. I know dustin did this slicker in-class, but this is as compact as I could get
    var gameArray = ['paper', 'scissors', 'rock']
    if (choice1 === 'rock' && choice2 === 'paper') {return 'user2'}
    if (choice1 === 'paper' && choice2 === 'rock') {return 'user1'}
    if (gameArray.indexOf(choice1) < gameArray.indexOf(choice2)) {return 'user2'}
    else return 'user1';
  }
  return playRPS(user1Choice, user2Choice)
}

// function to handle scorekeeping, takes an argument for whose score to increment (user1/user2/ties)
var keepScore = function(winner) {
  // bind a value for the score
  var oldScore;
  // grab the value from the DB for the winner, and return it
  database.ref('/currentGame/tally/' + winner + '/').once('value', function(snap) {
    return oldScore = snap.val()['num'];
  })
  // increment
  newScore = oldScore + 1;
  // set it on the DB
  database.ref('/currentGame/tally/' + winner + '/').set({
    num: newScore
  })
  // display on the screen
  docQS('#' + winner + 'Wins').textContent = newScore;
}


// fAuth listener for login status change
fAuth.onAuthStateChanged(function(user) {  
  if (user) {
    // switch to the wait screen
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

// database listener for the first time a child is added to the connections list
activeUsersRef.once('child_added', function(snap) {
  // grab the key for use in gameplay
  return curConnectKey = snap.key;
})


// database listener for when users are deleted after a user disconnects
database.ref('/currentGame/').on('child_removed', function(child) {
  // if it was user1 or user2 (which means a user left, triggering game reset)
  if (child.key === 'user1' || child.key === 'user2') {
    // reset all the displayed elements. this is required to reset the elements of a third-party observer
    resetText('user1Name', 'user1Choice', 'user1Wins', 'user2Name', 'user2Wins', 'user2Choice', 'whoWon', 'tiesWins')
      rpsChosen = false;
  }
})


// database listener for the currentGame ref to start game when both users are in
database.ref('/currentGame/').on('value', function(snap) {
  var current = snap.val();
  // flag for whether the game is running or not
  var gameRunningFlag;
  database.ref('/gameRunningFlag/').once('value', function(snap2) {
    if (snap2.val()) {
      return gameRunningFlag = snap2.val()['running'];
    }
  })
  if (current.user1 && current.user2 && authUserNum()) {
    database.ref('/gameRunningFlag/').set({
      running: true
    })
    // launch the game
    docQS('#waitScreen').classList.add('hidden');
    docQS('#fightScreen').classList.remove('hidden');  
    docQS('#user1Name').textContent = current.user1['displayName'];
    docQS('#user2Name').textContent = current.user2['displayName'];
    
  }
})



// database listener for when a user connects
connectedRef.on('value', function(snap) {
  if (snap.val()) {
    // log the connection
    var userConnected = activeUsersRef.push(true);
    // delete on disconnect
    userConnected.onDisconnect().remove();
  }
})

// database listener for when a child is removed from the connections list
activeUsersRef.on('child_removed', function(child) {
  // bind vars for user keys
  var user1Key;
  var user2Key;
  database.ref('/currentGame/user1/').once('value', function(snap) {
    if (snap.val()) {
      // grab the key of the leaving user
      return user1Key = snap.val()['key'];
    }
  })
  database.ref('/currentGame/user2/').once('value', function(snap) {
    if (snap.val()) {
      // grab the key of the leaving user
      return user2Key = snap.val()['key'];
    }
  })  
  // check if the leaving user is a current game user
  if (curConnectKey === user2Key || curConnectKey === user1Key) {    
    // additional check, to ensure the below only applies to an active in-game user
    if (authUserNum()) {
      // transition from fight to wait screens and inform user
      docQS('#fightScreen').classList.add('hidden')
      docQS('#waitScreen').classList.remove('hidden')
      docQS('#statusDisplay').textContent = 'Your Opponent Left! Click To Start Another Game!'
      // enable the start button
      docQS('#startBtn').disabled = false;
      // reset the text boxes and the flag that says whether a RPS choice has been made
      resetText('user1Name', 'user1Choice', 'user1Wins', 'user2Name', 'user2Wins', 'user2Choice', 'whoWon', 'tiesWins')
      rpsChosen = false;
    }
    // clean up the gameplay database 
    database.ref('/currentGame/user1/').remove();
    database.ref('/currentGame/user2/').remove();
    database.ref('/currentGame/choices/').remove();
    database.ref('/gameRunningFlag/').set({
      running: false
    })
    // reset the tally
    database.ref('/currentGame/tally/ties/').set({
      num: 0
    })
    database.ref('/currentGame/tally/user1/').set({
      num: 0
    })
    database.ref('/currentGame/tally/user2/').set({
      num: 0
    })
  }
})

// database listener for gameplay
database.ref('/currentGame/choices/').on('value', function(snap) {
  // if choices isn't there
  if (!snap.val()) {
    // grab all the gameplay buttons
    document.querySelectorAll('.gameplayBtn').forEach(function(element) {
      // enable them
      element.disabled = false;
    })
  }
  // if only one player has chosen and this is the user who chose
  if (snap.val() && Object.keys(snap.val()).length === 1 && rpsChosen) {
    // grab all the gameplay buttons
    document.querySelectorAll('.gameplayBtn').forEach(function(element) {
      // disable them
      element.disabled = true;
    })
  }
  // if both players have made a choice  
  if (snap.val() && Object.keys(snap.val()).length === 2) {
    rpsChosen = false;    
    // run the rps eval function, binding the result to winner
    var winner = evalWinner();
    keepScore(winner);
    // cleanup this game's choices
    database.ref('/currentGame/choices/').remove()
    database.ref('/currentGame/user1/choice/').remove()
    database.ref('/currentGame/user2/choice/').remove()    
    // check for a tie
    if (winner === 'ties') {
      console.log('its a tie!')
      docQS("#whoWon").textContent = 'It is a tie!'
    }
    // get the displayname of the winner
    else {
      var winnerName;
      database.ref('/currentGame/' + winner + '/').once('value', function(snap) {
        return winnerName = snap.val()['displayName'];
      })
      docQS('#whoWon').textContent = 'Winner Is: ' + winnerName;
    }
  }
})

// document listener for Start Game button
document.querySelector('#startBtn').onclick = function() {gameReadyCheck()}

// document listener for the Login button
document.querySelector('#loginButton').onclick = function(event) {
  // prevent page reload on click
  event.preventDefault();
  // var for entered username
  var userDisplayName = document.querySelector('#loginText').value;  
  // if a value is entered
  if (userDisplayName) {
    // signin anon
    fAuth.signInAnonymously().then(function(snap) {
        var uid = snap.user.uid;        
        // on the database
        database.ref('/' + uid + '/info/').set({
          // create an entry for them. this is redundant right now, but was added for future funcitonality
            displayName: userDisplayName,
            userID: uid
          })
          // update the firebase auth profile as well
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

// document listener for the gameplay buttons
var gameplayBtns = document.querySelectorAll('.gameplayBtn')
gameplayBtns.forEach(function(element) {
  // add an onclick event listener to all
  element.addEventListener('click', function() {
    // flag that this user has chosen
    rpsChosen = true;
    // run the RPS function on the value of the button
    chooseRPS(this.textContent.toLowerCase())
  })
})

