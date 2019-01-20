/**
 * Solid podStorage connect widget
 * inspired from RemoteStorage Widget (https://github.com/remotestorage/remotestorage-widget)
 * 
 * podStorage							   - session cookie contains : https://<podName> default taken from webId
 * 
 * @constructor
 *
 * @param {object}  remoteStorage          - Solid podStorage instance
 * @param {object}  options                - Widget options
 * @param {boolean} options.leaveOpen      - Do not minimize widget when user clicks
 *                                           outside of it (default: false)
 * @param {number}  options.autoCloseAfter - Time after which the widget closes
 *                                           automatically in ms (default: 1500)
 * @param {boolean} options.skipInitial    - Don't show the initial connect hint,
 *                                           but show sign-in screen directly instead
 *                                           (default: false)
 * @param {boolean} options.logging        - Enable logging (default: false)
 */
let Widget = function(remoteStorage, options={}) {
  this.rs = remoteStorage;
  this.userAddress ="";

  this.leaveOpen      = options.leaveOpen ? options.leaveOpen : false;
  this.autoCloseAfter = options.autoCloseAfter ? options.autoCloseAfter : 1500;
  this.skipInitial    = options.skipInitial ? options.skipInitial : false;
  this.logging        = options.logging ? options.logging : false;

  // true if we have remoteStorage connection's info
  this.active = false;

  // remoteStorage is connected!
  this.online = false;

  // widget is minimized ?
  this.closed = false;

};

Widget.prototype = {

  log (...msg) {
    if (this.logging) {
      console.debug('[RS-WIDGET] ', ...msg);
    }
  },

  // handle events !
  eventHandler (event, msg) {
    this.log('EVENT: ', event);
//console.log(event);
    switch (event) {
      case 'disconnected':
        this.active = false;
        this.setBackendClass(); // removes all backend CSS classes
        this.open();
        this.setInitialState();
        break;
      case 'connected':
        this.active = true;
        this.online = true;
		this.rs.checkSession().then( session => {
		  console.log("Logged in as "+session.webId+" "+this.userAddress);
		  if (this.userAddress == "") {this.userAddress = sessionStorage.getItem('podStorage');} // alert(this.userAddress);}
          this.rsConnectedUser.innerHTML = this.userAddress;  // connectedUser;
          this.setBackendClass("remotestorage");  //  this.rs.backend);
          this.rsConnectedLabel.textContent = "webId : "+session.webId.split("/")[2];
          this.setState('connected');
		  }, err => {alert(err); this.setState('disconnected');
		});
        break;
      case 'error':
        this.setBackendClass("remotestorage");  //  this.rs.backend);

        if (msg.slice(0,16) === "PodStorage error") {
          this.handleDiscoveryError(msg);
        } else if (msg.name === 'SyncError') {
          this.handleSyncError(msg);
        } else if (msg.name === 'Unauthorized') {
          this.handleUnauthorized(msg);
        } else {
          console.debug('Encountered unhandled error', msg);
        }

        break;
    }
  },

  setState (state) {
    if (state) {
      this.log('Setting state ', state);
      let lastSelected = document.querySelector('.rs-box.rs-selected');
      if (lastSelected) {
        lastSelected.classList.remove('rs-selected');
      }

      let toSelect = document.querySelector('.rs-box.rs-box-'+state);
      if (toSelect) {
        toSelect.classList.add('rs-selected');
      }
      let currentStateClass = this.rsWidget.className.match(/rs-state-\S+/g)[0];
      this.rsWidget.classList.remove(currentStateClass);
      this.rsWidget.classList.add("rs-state-"+(state || this.state));  //  bug

      this.state = state;
    }
  },


  /**
   * Set widget to its inital state
   *
   * @private
   */
  setInitialState () {
    if (this.skipInitial) {
      this.showChooseOrSignIn();
    } else {
      this.setState('initial');
    }
  },

  /**
   * Create the widget element and add styling.
   *
   * @returns {object} The widget's DOM element
   *
   * @private
   */
  createHtmlTemplate () {
    const element = document.createElement('div');
    const style = document.createElement('style');
    style.innerHTML = require('raw!./assets/styles.css');

    element.id = "remotestorage-widget";
    element.innerHTML = require('html!./assets/widget.html');
    element.appendChild(style);

    return element;
  },

  /**
   * Save all interactive DOM elements as variables for later access.
   *
   * @private
   */
  setupElements () {
    this.rsWidget = document.querySelector('.rs-widget');
    this.rsInitial = document.querySelector('.rs-box-initial');
    this.rsConnected = document.querySelector('.rs-box-connected');
    this.rsSignIn = document.querySelector('.rs-box-sign-in');

    this.rsConnectedLabel = document.querySelector('.rs-box-connected .rs-sub-headline');
    this.rsErrorBox = document.querySelector('.rs-box-error .rs-error-message');

    this.rsSignInForm = document.querySelector('.rs-sign-in-form');
    this.rsConnectButton = document.querySelector('.rs-connect');

    this.rsDisconnectButton = document.querySelector('.rs-disconnect');
    this.rsLogo = document.querySelector('.rs-widget-icon');

    this.rsErrorReconnectLink = document.querySelector('.rs-box-error a.rs-reconnect');
    this.rsErrorDisconnectButton = document.querySelector('.rs-box-error button.rs-disconnect');

    this.rsConnectedUser = document.querySelector('.rs-connected-text h1.rs-user');
  },

  /**
   * Setup all event handlers
   *
   * @private
   */
  setupHandlers () {
	this.rs.checkSession().then( session => {
		this.eventHandler("connected");
		}, err => this.eventHandler("disconnected")
	);
    this.setEventListeners();
    this.setClickHandlers();
  },

  /**
   * Append widget to the DOM.
   *
   * If an elementId is specified, it will be appended to that element,
   * otherwise it will be appended to the document's body.
   *
   * @param  {String} [elementId] - Widget's parent
   */
  attach (elementId) {
    const domElement = this.createHtmlTemplate();

    if (elementId) {
      const parent = document.getElementById(elementId);
      if (!parent) {
        throw "Failed to find target DOM element with id=\"" + elementId + "\"";
      }
      parent.appendChild(domElement);
    } else {
      document.body.appendChild(domElement);
    }

    this.setupElements();
    this.setupHandlers();
    this.setInitialState();
  },

  setEventListeners () {
    // Sign-in form
    this.rsSignInForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.userAddress = document.querySelector('input[name=rs-user-address]').value;
	  // test podStorage nd set session cookie
	  this.rs.popupLogin()
	  .then( webId => {
		  if ( this.userAddress != "")
			{this.rs.readFolder(this.userAddress+"/public")
				.then( folder => {
					this.eventHandler("connected");
					sessionStorage.setItem('podStorage', this.userAddress)
				}, err => {
					this.rs.logout().then( console.log("logout podStotage error "+err)); // , err => console.log(err));
					this.eventHandler("error","PodStorage error : "+err)})
			}else {
				this.userAddress = "https://"+webId.split("/")[2];
				sessionStorage.setItem('podStorage', this.userAddress);
				this.eventHandler("connected");
			}
			}, err => {alert("popup login : "+err); this.eventHandler("disconnected")}
    	  )
    })
  },

  setClickHandlers () {
    // Initial button
    this.rsInitial.addEventListener('click', () => this.setState('sign-in') );// this.showChooseOrSignIn() );

    // Disconnect button
    this.rsDisconnectButton.addEventListener('click', () => this.disconnect() );

    // Reduce to icon only if connected and clicked outside of widget
    document.addEventListener('click', () => this.close() );

    // Clicks on the widget stop the above event
    this.rsWidget.addEventListener('click', e => e.stopPropagation() );

    // Click on the logo to toggle the widget's open/close state
    this.rsLogo.addEventListener('click', () => this.toggle() );
  },

  /**
   * Reset the widget after disconnect.
   */
  disconnect() {
	this.userAddress ="";
	sessionStorage.removeItem('podStorage');
	this.rs.logout().then( res => console.log("logout"), err => console.log("logout "+err));
    this.setInitialState();

    let msgContainer = document.querySelector('.rs-sign-in-error');
    msgContainer.innerHTML = "";
  	msgContainer.classList.remove('rs-visible');
    msgContainer.classList.add('rs-hidden');
  },

  /**
   * Toggle between the widget's open/close state.
   *
   * When then widget is open and in initial state, it will show the backend
   */
  toggle () {
    if (this.closed) {
      this.open();
    } else {
      if (this.state === 'initial') {
        this.showChooseOrSignIn();
      } else {
        this.close();
      }
    }
  },

  /**
   * Open the widget.
   */
  open () {
    this.closed = false;
    this.rsWidget.classList.remove('rs-closed');
    this.shouldCloseWhenSyncDone = false; // prevent auto-closing when user opened the widget
  },

  /**
   * Close the widget to only show the icon.
   *
   * If the ``leaveOpen`` config is true or there is no storage connected,
   * the widget will not close.
   */
  close () {
    // don't do anything when we have an error
    if (this.state === 'error') { return; }

    if (!this.leaveOpen && this.active) {
      this.closed = true;
      this.rsWidget.classList.add('rs-closed');
    } else if (this.active) {
      this.setState('connected');
    } else {
      this.setInitialState();
    }
  },

  /**
   * Set the remoteStorage backend type to show the appropriate icon.
   * If no backend is given, all existing backend CSS classes will be removed.
   *
   * @param {string} [backend]
   *
   * @private
   */
  setBackendClass (backend) {
    this.rsWidget.classList.remove('rs-backend-remotestorage');

    if (backend) {
      this.rsWidget.classList.add(`rs-backend-${backend}`);
    }
  },

  showErrorBox (errorMsg) {
    this.rsErrorBox.innerHTML = errorMsg;
    this.setState('error');
  },

  hideErrorBox () {
    this.rsErrorBox.innerHTML = '';
    this.close();
  },

  handleDiscoveryError (error) {
    let msgContainer = document.querySelector('.rs-sign-in-error');
    msgContainer.innerHTML = error;
    msgContainer.classList.remove('rs-hidden');
    msgContainer.classList.add('rs-visible');
    this.rsConnectButton.disabled = false;
  },
  
  handleSyncError (/* error */) {
    // console.debug('Encountered SyncError', error);
    this.open();
    this.showErrorBox('App sync error');
  },

  handleUnauthorized (error) {
    if (error.code && error.code === 'access_denied') {
      this.rs.logout().then( res => console.log("logout"), err => console.log("logout "+err));
    } else {
      this.open();
      this.showErrorBox(error.message + " ");
      this.rsErrorBox.appendChild(this.rsErrorReconnectLink);
      this.rsErrorReconnectLink.classList.remove('rs-hidden');
    }
  },

};

module.exports = Widget;
