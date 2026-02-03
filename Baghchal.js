const audioCtx = new(window
  .AudioContext || window
  .webkitAudioContext)();
const STEP = 80;
let board, turn, phase,
  goatsHand, goatsDead,
  selected, validMoves;
let gameMode, myRole, peer,
  conn;
let restartVotes = {
  me: false,
  peer: false
};
let isIntentionalDisconnect =
  false;

// Chat variables
let isChatOpen = false;

function showScreen(id) {
  document.querySelectorAll(
    '.screen').forEach(
    s => s.classList
    .remove('active'));
  document.getElementById(
      'screen-' + id)
    .classList.add(
      'active');
  document.getElementById(
      'overlay').classList
    .remove('show');
  document.getElementById(
      'join-error').style
    .display = 'none';
}

function initGame(mode, role) {
  gameMode = mode;
  myRole = role;
  board = Array(5).fill().map(
    () => Array(5).fill(
      null));
  board[0][0] = board[0][4] =
    board[4][0] = board[4][
      4
    ] = 'T';
  turn = 'G';
  phase = 'place';
  goatsHand = 20;
  goatsDead = 0;
  selected = null;
  validMoves = [];
  restartVotes = {
    me: false,
    peer: false
  };
  
  drawGrid();
  render();
  showScreen('game');
  
  const announcer = document
    .getElementById(
      'role-announcer');
  const chatWrapper = document
    .getElementById(
      'chat-toggle-wrapper'
    );
  
  if (gameMode === 'online') {
    announcer.innerText =
      myRole === 'G' ?
      'YOU ARE GOAT 🐐' :
      'YOU ARE TIGER 🐯';
    announcer.classList
      .remove(
        'pulse-text');
    void announcer
      .offsetWidth;
    announcer.classList.add(
      'pulse-text');
    
    // Show chat in online mode
    chatWrapper.style
      .display = 'flex';
    
    if (document
      .getElementById(
        'chat-messages')
      .childElementCount >
      100) {
      document
        .getElementById(
          'chat-messages'
        )
        .innerHTML =
        '<div style="text-align:center; opacity:0.5; font-style:italic; font-size:0.8rem;">Chat is encrypted (P2P)</div>';
    }
  } else {
    announcer.innerText =
      "LOCAL MATCH";
    chatWrapper.style
      .display = 'none';
    document.getElementById(
        'chat-panel')
      .classList.remove(
        'open');
    document.getElementById(
        'chat-mask')
      .classList.remove(
        'active');
  }
}

// --- CHAT FUNCTIONS ---
function toggleChat() {
  const panel = document
    .getElementById(
      'chat-panel');
  const mask = document
    .getElementById(
      'chat-mask');
  isChatOpen = !isChatOpen;
  
  if (isChatOpen) {
    
    document.body.classList
      .add('chat-mode');
    
    panel.classList.add(
      'open');
    mask.classList.add(
      'active');
    document.getElementById(
        'chat-badge')
      .style.display =
      'none';
    
    setTimeout(() =>
      document
      .getElementById(
        'chat-input'
      ).focus(),
      300);
  } else {
    document.body.classList
      .remove(
        'chat-mode');
    
    panel.classList.remove(
      'open');
    mask.classList.remove(
      'active');
    document.getElementById(
        'chat-input')
      .blur();
  }
}

function sendChat() {
  const input = document
    .getElementById(
      'chat-input');
  const msg = input.value
    .trim();
  if (!msg) return;
  
  if (gameMode === 'online' &&
    conn) {
    conn.send({
      type: 'chat',
      msg: msg
    });
    appendMessage(msg,
      true);
    input.value = '';
  }
}

function appendMessage(msg,
  isMe) {
  const container = document
    .getElementById(
      'chat-messages');
  const bubble = document
    .createElement('div');
  bubble.className =
    'chat-bubble ' + (isMe ?
      'me' : 'peer');
  bubble.textContent = msg;
  container.appendChild(
    bubble);
  container.scrollTop =
    container.scrollHeight;
  
  if (!isMe && !isChatOpen) {
    document.getElementById(
        'chat-badge')
      .style.display =
      'block';
    playThok
      (); // reuse sound for notification
  }
}

// Handle Enter key in chat
document.getElementById(
    'chat-input')
  .addEventListener(
    'keypress',
    function(e) {
      if (e.key ===
        'Enter')
        sendChat();
    });


function drawGrid() {
  const svg = document
    .getElementById(
      'board-svg');
  svg.innerHTML = '';
  const lineColor =
    "rgba(255, 235, 205, 0.4)";
  
  const createLine = (x1, y1,
    x2, y2) => {
    const l = document
      .createElementNS(
        'http://www.w3.org/2000/svg',
        'line');
    l.setAttribute('x1',
      x1);
    l.setAttribute('y1',
      y1);
    l.setAttribute('x2',
      x2);
    l.setAttribute('y2',
      y2);
    l.setAttribute(
      'stroke',
      lineColor);
    l.setAttribute(
      'stroke-width',
      '3');
    l.setAttribute(
      'stroke-linecap',
      'round');
    svg.appendChild(l);
  };
  
  createLine(0, 0, 320, 320);
  createLine(320, 0, 0, 320);
  createLine(160, 0, 320,
    160);
  createLine(320, 160, 160,
    320);
  createLine(160, 320, 0,
    160);
  createLine(0, 160, 160, 0);
  
  for (let i = 0; i <
    5; i++) {
    createLine(0, i * STEP,
      320, i * STEP);
    createLine(i * STEP, 0,
      i * STEP, 320);
  }
}

function render() {
  const layer = document
    .getElementById(
      'game-layer');
  layer.innerHTML = '';
  const statusLabel = document
    .getElementById(
      'status-label');
  
  let turnText = turn ===
    'G' ? "Goat's Turn" :
    "Tiger's Turn";
  if (gameMode === 'online') {
    turnText = (turn ===
        myRole) ?
      "Your Move" :
      "Friend's Move";
  }
  
  statusLabel.innerText =
    turnText;
  statusLabel.style.color =
    turn === 'G' ?
    'var(--goat-text)' :
    'var(--tiger-text)';
  document.getElementById(
      'g-hand')
    .innerText = goatsHand;
  document.getElementById(
      'g-dead')
    .innerText =
    `${goatsDead}/5`;
  
  for (let r = 0; r <
    5; r++) {
    for (let c = 0; c <
      5; c++) {
      const node =
        document
        .createElement(
          'div');
      node.className =
        'node';
      node.style.top = (
          r * STEP) +
        'px';
      node.style.left = (
          c * STEP) +
        'px';
      const p = board[r][
        c
      ];
      
      if (p) {
        const pDiv =
          document
          .createElement(
            'div');
        pDiv.className =
          'piece' + (
            selected &&
            selected
            .r ===
            r &&
            selected
            .c ===
            c ?
            ' selected' :
            '');
        pDiv.innerText =
          p === 'T' ?
          '🐯' : '🐐';
        node.appendChild(
          pDiv);
      }
      if (gameMode ===
        'local' ||
        turn === myRole
      ) {
        const m =
          validMoves
          .find(mv =>
            mv.r ===
            r && mv
            .c === c
          );
        if (m) {
          const h =
            document
            .createElement(
              'div'
            );
          h.className =
            'hint';
          node.appendChild(
            h);
        }
      }
      node.onclick = () =>
        handleInput(r,
          c);
      layer.appendChild(
        node);
    }
  }
}

function handleInput(r, c) {
  if (gameMode === 'online' &&
    turn !== myRole) return;
  if (isChatOpen) return;
  processMove(r, c);
}

function processMove(r, c,
  isRemote = false) {
  const p = board[r][c];
  if (gameMode === 'online' &&
    !isRemote) conn
    .send({
      type: 'move',
      r,
      c
    });
  
  if (turn === 'G' &&
    phase === 'place' && !p
  ) {
    board[r][c] = 'G';
    goatsHand--;
    if (goatsHand === 0)
      phase = 'move';
    playThok();
    switchTurn();
    return;
  }
  if (p === turn) {
    if (turn === 'G' &&
      phase === 'place')
      return;
    selected = { r, c };
    findMoves(r, c);
    render();
    return;
  }
  if (selected) {
    const m = validMoves
      .find(mv => mv.r ===
        r && mv.c === c
      );
    if (m) {
      board[m.r][m.c] =
        board[selected
          .r][selected
          .c
        ];
      board[selected.r][
        selected.c
      ] = null;
      if (m.type ===
        'kill') {
        board[m.kr][m
            .kc
          ] =
          null;
        goatsDead++;
      }
      playThok();
      selected = null;
      validMoves = [];
      if (goatsDead >= 5)
        end(
          "TIGERS TRIUMPH"
        );
      else switchTurn();
    } else {
      selected = null;
      validMoves = [];
      render();
    }
  }
}

function switchTurn() {
  turn = turn === 'G' ? 'T' :
    'G';
  if (turn === 'T' &&
    checkTrap()) {
    end("GOATS TRIUMPH");
    return;
  }
  render();
}

function end(msg) {
  document.getElementById(
      'overlay').classList
    .add('show');
  document.getElementById(
      'win-msg')
    .innerText = msg;
  document.getElementById(
      'win-msg').style
    .color = msg.includes(
      "GOAT") ?
    "var(--goat-text)" :
    "var(--tiger-text)";
  document.getElementById(
      'win-details')
    .innerText = msg
    .includes("GOAT") ?
    "The Tigers have been trapped." :
    "The herd has been decimated.";
  document.getElementById(
      'restart-btn')
    .innerText = "Rematch";
  document.getElementById(
      'restart-btn')
    .disabled = false;
}

function triggerDisconnect() {
  if (isIntentionalDisconnect)
    return;
  if (gameMode !== 'online')
    return;
  
  // --- FIX: Close chat if open ---
  if (isChatOpen)
    toggleChat();
  // -------------------------------
  
  document.getElementById(
      'overlay').classList
    .remove('show');
  document.getElementById(
    'disconnect-overlay'
  ).classList.add(
    'active');
  
  let count = 3;
  const interval =
    setInterval(() => {
      count--;
      const timerEl =
        document
        .getElementById(
          'reload-timer'
        );
      if (timerEl)
        timerEl
        .innerText =
        `Returning To Lobby in ${count}...`;
      
      if (count <=
        0) {
        clearInterval
          (
            interval
          );
        location
          .reload();
      }
    }, 1000);
}

function quitGame() {
  if (conn) {
    isIntentionalDisconnect
      = true;
    conn.close();
    location.reload();
  } else {
    showScreen('home');
  }
}

function requestRestart() {
  if (gameMode === 'online') {
    restartVotes.me = true;
    conn
      .send({ type: 'restart-vote' });
    document.getElementById(
        'restart-btn')
      .innerText =
      "Awaiting Friend...";
    document.getElementById(
        'restart-btn')
      .disabled = true;
    if (restartVotes.peer &&
      (conn.peer > peer
        .id)) {
      const role = Math
        .random() >
        0.5 ? 'G' : 'T';
      conn.send({
        type: 'init',
        role: role ===
          'G' ?
          'T' : 'G'
      });
      initGame('online',
        role);
    }
  } else initGame('local',
    'G');
}

function setupConn() {
  conn.on('open', () => {
    document
      .getElementById(
        'join-error'
      ).style
      .display =
      'none';
    if (conn.peer >
      peer.id) {
      const role =
        Math
        .random() >
        0.5 ?
        'G' :
        'T';
      setTimeout(
        () => {
          conn.send({
            type: 'init',
            role: role ===
              'G' ?
              'T' : 'G'
          });
          initGame
            ('online',
              role
            );
        },
        500);
    }
  });
  conn.on('data', (data) => {
    if (data
      .type ===
      'init')
      initGame(
        'online',
        data
        .role);
    if (data
      .type ===
      'move')
      processMove(
        data.r,
        data.c,
        true);
    if (data
      .type ===
      'chat')
      appendMessage(
        data
        .msg,
        false
      ); // Handle incoming chat
    if (data
      .type ===
      'restart-vote'
    ) {
      restartVotes
        .peer =
        true;
      if (!
        restartVotes
        .me) {
        document
          .getElementById(
            'friend-status'
          )
          .innerText =
          "Your Friend Wants a Rematch.";
      }
      if (restartVotes
        .me && (
          conn
          .peer >
          peer
          .id)
      ) {
        const
          role =
          Math
          .random() >
          0.5 ?
          'G' :
          'T';
        conn.send({
          type: 'init',
          role: role ===
            'G' ?
            'T' : 'G'
        });
        initGame
          ('online',
            role
          );
      }
    }
  });
  conn.on('close',
    triggerDisconnect);
  conn.on('error',
    triggerDisconnect);
}

function initPeer() {
  if (peer) return;
  const randomID = Math.floor(
      100000 + Math
      .random() * 900000)
    .toString();
  peer = new Peer(randomID);
  
  peer.on('open', id => {
    const display =
      document
      .getElementById(
        'peer-id-display'
      );
    display
      .innerText =
      id;
    document
      .getElementById(
        'copy-hint'
      ).style
      .display =
      'block';
  });
  
  peer.on('connection', c => {
    conn = c;
    setupConn();
  });
  
  peer.on('error', (err) => {
    if (err.type ===
      'peer-unavailable'
    ) {
      document
        .getElementById(
          'join-error'
        )
        .style
        .display =
        'block';
    }
  });
}

function copyRoomID() {
  const display = document
    .getElementById(
      'peer-id-display');
  const id = display
    .innerText;
  if (id === "Connecting...")
    return;
  
  navigator.clipboard
    .writeText(id).then(
      () => {
        const
          originalBg =
          display
          .style
          .background;
        display.style
          .background =
          "var(--highlight)";
        setTimeout(() =>
          display
          .style
          .background =
          originalBg,
          200);
      });
}

function joinRoom() {
  const id = document
    .getElementById(
      'join-id').value;
  if (!id) return;
  document.getElementById(
      'join-error').style
    .display = 'none';
  conn = peer.connect(id);
  setupConn();
}

function findMoves(r, c) {
  validMoves = [];
  const ds = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1]
  ];
  ds.forEach(([dr, dc]) => {
    if ((dr !== 0 &&
        dc !== 0
      ) && (
        r + c) %
      2 !== 0)
      return;
    const nr = r +
      dr,
      nc = c + dc;
    if (nr >= 0 &&
      nr < 5 &&
      nc >= 0 &&
      nc < 5) {
      if (!board[
          nr][
          nc
        ])
        validMoves
        .push({
          r: nr,
          c: nc,
          type: 'move'
        });
      else if (
        turn ===
        'T' &&
        board[
          nr][
          nc
        ] ===
        'G') {
        const
          jr =
          nr +
          dr,
          jc =
          nc +
          dc;
        if (jr >=
          0 &&
          jr <
          5 &&
          jc >=
          0 &&
          jc <
          5 &&
          !
          board[
            jr
          ]
          [jc]
        )
          validMoves
          .push({
            r: jr,
            c: jc,
            type: 'kill',
            kr: nr,
            kc: nc
          });
      }
    }
  });
}

function checkTrap() {
  for (let r = 0; r <
    5; r++) {
    for (let c = 0; c <
      5; c++) {
      if (board[r][c] ===
        'T') {
        const ds = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-1, -
            1
          ],
          [-1, 1],
          [1, -1],
          [1, 1]
        ];
        for (let [dr,
            dc
          ] of ds) {
          if ((dr !==
              0 &&
              dc !==
              0
            ) &&
            (r +
              c) %
            2 !== 0)
            continue;
          const nr =
            r + dr,
            nc = c +
            dc;
          if (nr >=
            0 &&
            nr <
            5 &&
            nc >=
            0 &&
            nc < 5
          ) {
            if (!
              board[
                nr
              ]
              [nc]
            )
              return false;
            const
              jr =
              nr +
              dr,
              jc =
              nc +
              dc;
            if (board[
                nr
              ]
              [
                nc
              ] ===
              'G' &&
              jr >=
              0 &&
              jr <
              5 &&
              jc >=
              0 &&
              jc <
              5 &&
              !
              board[
                jr
              ]
              [jc]
            )
              return false;
          }
        }
      }
    }
  }
  return true;
}

function playThok() {
  if (audioCtx.state ===
    'suspended') audioCtx
    .resume();
  const now = audioCtx
    .currentTime;
  const osc1 = audioCtx
    .createOscillator();
  const gain1 = audioCtx
    .createGain();
  osc1.type = 'triangle';
  osc1.frequency
    .setValueAtTime(150,
      now);
  osc1.frequency
    .exponentialRampToValueAtTime(
      10, now + 0.05);
  gain1.gain.setValueAtTime(
    1.0, now);
  gain1.gain
    .exponentialRampToValueAtTime(
      0.01, now + 0.05);
  const osc2 = audioCtx
    .createOscillator();
  const gain2 = audioCtx
    .createGain();
  osc2.type = 'sine';
  osc2.frequency
    .setValueAtTime(80,
      now);
  gain2.gain.setValueAtTime(
    1.0, now);
  gain2.gain
    .exponentialRampToValueAtTime(
      0.01, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(audioCtx
    .destination);
  osc2.connect(gain2);
  gain2.connect(audioCtx
    .destination);
  osc1.start(now);
  osc1.stop(now + 0.05);
  osc2.start(now);
  osc2.stop(now + 0.15);
}

function startLocalMultiplayer() {
  initGame('local', 'G');
}

function showOnlinePanel() {
  showScreen('online');
  initPeer();
}