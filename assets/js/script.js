
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



// Returns the signed-in user's display name.
function getUserName() {
  return fAuth.currentUser.displayName;
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
  return !!fAuth.currentUser;
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

// listener for when a user connects
connectedRef.on('value', function(snap) {
  if (snap.val()) {

    // var currentUID = 'temp';
    // if (isUserSignedIn()) {
    //   currentUID = fAuth.currentUser.uid;
    // }
    // // add the user to the connections list
    var userConnected = activeUsersRef.push(true);
    // console.log(Object.keys(snap.val()))    
    // remove from the listwhen they disconnect
    userConnected.onDisconnect().remove();
  }
})


// listener for the first time a child is added to the connections list
activeUsersRef.once('child_added', function(snap) {
  // console.log(snap.key)
  return curConnectKey = snap.key;
})


// listener for when users are deleted after a user disconnects
database.ref('/currentGame/').on('child_removed', function(child) {
  // console.log(child.key);
  if (child.key === 'user1' || child.key === 'user2') {
    console.log('child removed');
    resetText('user1Name', 'user1Choice', 'user1Wins', 'user2Name', 'user2Wins', 'user2Choice', 'whoWon', 'tiesWins')
      rpsChosen = false;
  }
})
// listener for when a child is removed from the connections list
activeUsersRef.on('child_removed', function(child) {
  console.log(child.key);
  var user1Key;
  var user2Key;
  database.ref('/currentGame/user1/').once('value', function(snap) {
    if (snap.val()) {
      return user1Key = snap.val()['key'];
    }
  })
  database.ref('/currentGame/user2/').once('value', function(snap) {
    if (snap.val()) {
      return user2Key = snap.val()['key'];
    }
  })
  // console.log(user1Key + ' ' + user2Key);
  if (curConnectKey === user2Key || curConnectKey === user1Key) {
    
    
    if (authUserNum()) {
      docQS('#fightScreen').classList.add('hidden')
      docQS('#waitScreen').classList.remove('hidden')
      docQS('#statusDisplay').textContent = 'Your Opponent Left! Click To Start Another Game!'
      // docQS('#whoWon').textContent = '';
      docQS('#startBtn').disabled = false;
      resetText('user1Name', 'user1Choice', 'user1Wins', 'user2Name', 'user2Wins', 'user2Choice', 'whoWon', 'tiesWins')
      rpsChosen = false;
      
      
    }
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

// fAuth listener for login status change
fAuth.onAuthStateChanged(function(user) {  
  if (user) {    
    // if (!nameDisplayed) {
    //   console.log('displaying user name')
    //   document.querySelector('#userName').textContent = fAuth.currentUser.displayName;
    // }    
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
      // console.log('Not enough room!')
      updateStat('Game Is Full! You Can Try Again Soon!');
    // if game has only 1 player
    } else if (current.user1) {
      // function to add user as user2
      // console.log('you are in, get ready to play!')
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
      // function to add user as user1
      // console.log('you are in, searching for opponent!')
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
  var currentID = fAuth.currentUser.uid;
  var userNumber;
  var currentGame = database.ref('/currentGame/');
  currentGame.once('value', function(snap) {
    for (var user in snap.val()) {
      console.log(snap.val()[user]['userID']);
      if (snap.val()[user]['userID'] === currentID) {
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
    database.ref('/currentGame/' + user + '/choice/').once('value', function(snap) {
      // console.log(snap.val()['choice']);
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
  // console.log('user1 chose: ' + user1Choice + ' user 2 chose: ' + user2Choice)
  // RPS functionality
  var playRPS = function(choice1, choice2) {
    if (choice1 === choice2) {return 'ties'}
    // array for resolving gameplay
    var gameArray = ['paper', 'scissors', 'rock']
    if (choice1 === 'rock' && choice2 === 'paper') {return 'user2'}
    if (choice1 === 'paper' && choice2 === 'rock') {return 'user1'}
    if (gameArray.indexOf(choice1) < gameArray.indexOf(choice2)) {return 'user2'}
    else return 'user1';
  }
  return playRPS(user1Choice, user2Choice)
}

// listener for the currentGame ref to start game when both users are in
database.ref('/currentGame/').on('value', function(snap) {
  var current = snap.val();
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
    // console.log(snap.val())
    // launch the game
    docQS('#waitScreen').classList.add('hidden');
    docQS('#fightScreen').classList.remove('hidden');
    
    // display the number of wins losses and ties
    // docQS('#user1Wins').textContent = 'Wins: 0'
    // docQS('#user2Wins').textContent = 'Wins: 0'
    // docQS('#tieWins').textContent = 'Ties: 0'
    // display the user names
    docQS('#user1Name').textContent = current.user1['displayName'];
    docQS('#user2Name').textContent = current.user2['displayName'];
    
  }
})

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

// database listener for gameplay
database.ref('/currentGame/choices/').on('value', function(snap) {
  console.log('rpsChosen: ' + rpsChosen)
  // if choices isn't there
  if (!snap.val()) {
    document.querySelectorAll('.gameplayBtn').forEach(function(element) {
      element.disabled = false;
    })
  }
  // if only one player has chosen and this is the user who chose
  if (snap.val() && Object.keys(snap.val()).length === 1 && rpsChosen) {
    document.querySelectorAll('.gameplayBtn').forEach(function(element) {
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
    
      // get the current number of ties from the DB
      // increment by one
      // set the new number of ties on the DB
      // display new tie count
      // database.ref('/currentGame/tally/').set
    }
    // get the displayname of the winner
    else {
      var winnerName;
      database.ref('/currentGame/' + winner + '/').once('value', function(snap) {
        return winnerName = snap.val()['displayName'];
      })
      console.log('winner is ' + winnerName);
      docQS('#whoWon').textContent = 'Winner Is: ' + winnerName;
    }
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
    // document.querySelector('#userName').textContent = userDisplayName;
    // flag that the name is displayed
    // nameDisplayed = true;
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
        // location.reload();
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
  // add an onclick event listener to all
  element.addEventListener('click', function() {
    // flag that this user has chosen
    rpsChosen = true;
    // run the RPS function on the value of the button
    chooseRPS(this.textContent.toLowerCase())
  })
})



// // User data location
// var currentUser = firebase.auth().currentUser

