// var for the database
var database = firebase.database();
// var for the auth
var fAuth = firebase.auth();

// var for the ref to track connections
var activeUsersRef = database.ref('/connections/');
// var for tracking connection changes
var connectedRef = database.ref('.info/connected');




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
activeUsersRef.on('value', function(snap) {
  console.log(snap.val())
})



// TODO: display names go to datastoreinstead of auth
// listener for when a user signs in
document.querySelector('#loginButton').onclick = function(event) {
  event.preventDefault();
  var userDisplayName = document.querySelector('#loginText').value;
  if (userDisplayName) {
    fAuth.signInAnonymously().catch(function(error) {
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode + errorMessage);
    })
    fAuth.currentUser.updateProfile({
      displayName: userDisplayName
    })
  } else {
    alert('Please enter a name!')
  }
}

// fAuth listener for login status change
fAuth.onAuthStateChanged(function(user) {  
  if (user) {
    // user is signed in
    // var userDisplayName = document.querySelector('#loginText').value;
    // if (userDisplayName) {
    //   user.updateProfile({
    //       displayName: userDisplayName
    //   })
    // }
    document.querySelector('#userName').textContent = getUserName();
    document.querySelector('#loginScreen').classList.add('hidden');
    document.querySelector('#fightScreen').classList.remove('hidden');
    
    console.log(fAuth.currentUser.displayName + ' is logged in.')
  } else {
    // user is signed out
  }
}, function(error) {
  console.log(error);
}, function() {
  console.log('its over now')
})

// // auth code snippets
// function signIn() {
//   var provider = new firebase.auth.GoogleAuthProvider();
//   firebase.auth().signInWithPopup(provider);
// }

// // Signs-out of Friendly Chat.
// function signOut() {
//   firebase.auth().signOut();
// }

// // Initiate firebase auth.
// function initFirebaseAuth() {
//   // Listen to auth state changes
//   firebase.auth().onAuthStateChanged(cb);
// }


// // User data location
// var currentUser = firebase.auth().currentUser

