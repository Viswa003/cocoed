const socket = io();

function joinRoom() {
  const roomCode = document.getElementById('room-input').value.trim();
  const username = document.getElementById('username-input').value.trim();

  if (roomCode && username) {
    document.getElementById('join-container').style.display = 'none';
    document.getElementById('editor-container').style.display = 'flex';

    // Emit 'joinRoom' event to the server
    socket.emit('joinRoom', roomCode, username);
  } else {
    alert('Please enter a valid room code and username.');
  }
}

function sendMessage() {
  const messageInput = document.getElementById('message-input');
  const message = messageInput.value.trim();

  if (message) {
    // Emit 'sendMessage' event to the server
    socket.emit('sendMessage', message);

    // Display the message in the chat area
    displayMessage('You', message);

    // Clear the input field
    messageInput.value = '';
  }
}

function displayMessage(username, message) {
  const chatMessages = document.getElementById('chat-messages');
  const messageElement = document.createElement('div');
  messageElement.innerHTML = `<strong>${username}:</strong> ${message}`;
  chatMessages.appendChild(messageElement);

  // Auto-scroll to the bottom of the chat area
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle 'userJoined' event from the server
socket.on('userJoined', (username) => {
  // Display a message indicating that a new user has joined
  displayMessage('System', `${username} has joined the room.`);
});

// Handle 'updateCode' event from the server
socket.on('updateCode', (code) => {
  // Update the code editor with the received code
  document.getElementById('code-editor').innerText = code;
});

// Handle 'updateParticipants' event from the server
socket.on('updateParticipants', (participants) => {
  // Update the participants list with the current participants
  const participantsList = document.getElementById('participants-list');
  participantsList.innerHTML = '<strong>Participants:</strong>';
  participants.forEach((participant) => {
    const participantElement = document.createElement('div');
    participantElement.innerText = participant;
    participantsList.appendChild(participantElement);
  });
});
