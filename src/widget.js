/**
 * Solid podStorage connect widget (https://github.com/bourgeoa/solid-file-widget)
 * inspired from RemoteStorage Widget (https://github.com/remotestorage/remotestorage-widget)
 *
 * @Return cookies in localStorage as URI
 * - appRootUri							  - https://<podName>/<appFolder> (default <podName> taken from webId)
 * - appFileUri							  - https://<podName>/<appFile>
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
 * @param 'boolean} options.windowReload   - Reload web app on disconnect (default: true)
 * @param {string}  options.appFolder	   - Root folder of the app (default: '/public')
 * @param {string}  options.appFile		   - appFile of the app (default: "")
 * @param {string}  options.solidAppName   - solidAppName shall find 'appFolder' through podStorage.card (default: "")
 */
//const auth = require('solid-auth-client')

let Widget = function(auth, remoteStorage, options={}) {
//	this.auth = remoteStorage //require('solid-auth-client') //remoteStorage
  this._auth = auth
  this.rs = new SolidFileClient(this._auth) //remoteStorage;
  this.click = false; // true if click on button disconnect

  this.leaveOpen      = options.leaveOpen ? options.leaveOpen : false;
  this.autoCloseAfter = options.autoCloseAfter ? options.autoCloseAfter : 1500;
  this.skipInitial    = options.skipInitial ? options.skipInitial : false;
  this.logging        = options.logging ? options.logging : false;
  this.windowReload	  = options.windowReload ? options.windowReload : true;
  this.appFile		  = options.appFile ? options.appFile : "";
  this.appFolder	  = options.appFolder ? options.appFolder : "/public";  // ajout / a la fin
  this.solidAppName   = options.solidAppName ? options.solidAppName : "";
  
  // true if we have remoteStorage connection's info
  this.active = false;

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
				this._auth.currentSession().then( session => {
		  console.log("Logged in as "+session.webId+" "+this.userAddress);
          this.rsConnectedUser.innerHTML = localStorage.getItem('appRootUri');
          this.setBackendClass("remotestorage");
          this.rsConnectedLabel.textContent = "webId : "+session.webId.split("/")[2];
          this.setState('connected');
		  }, err => {alert(err); this.click === false; this.setState('disconnected');
		});
      	if ( this.click === true && this.windowReload === true) {/*alert("connect windowReload");*/ window.location.reload(true)}
        break;
      case 'error':
        this.setBackendClass("remotestorage");
    	this._auth.logout().then( res => console.log("logout"), err => console.log("logout "+err));
        this.handleDiscoveryError(msg);
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
	this._auth.currentSession().then( session => {
		if (localStorage.getItem('appRootUri') === null) {
			this.click = false;
			this.eventHandler("disconnected");
			this._auth.logout().then( res => console.log("logout"), err => console.log("logout "+err));
		}else{
		this.eventHandler("connected");
		}
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
	  // test podStorage and set localstorage cookie
//	  await this._auth.logout().then( res => alert("logout"), err => alert("logout "+err));
	  this._auth.currentSession().then( session => {
			this._auth.logout().then( res => console.log("logout"), err => console.log("logout "+err))
	  })
	  alert("alain "+this.userAddress)
	  this._auth.popupLogin({ popupUri: 'https://solidcommunity.net/common/popup.html' })
	  .then( session => { const webId = session.webId
	  	alert(webId)
			if ( this.userAddress != "") {
	  			this.userAddress = this.userAddress.split("/",3).join('/');
			}else {
				this.userAddress = webId.split("/",3).join('/');
			}
			if (this.appFolder.charAt(0) !== '/') {this.appFolder = "/"+this.appFolder}
			this.appRootUri = this.userAddress+this.appFolder;
			if (this.appFile.charAt(0) !== '/') {this.appFile = "/"+this.appFile}
			this.appFileUri = this.userAddress+this.appFile;
  			if ( this.solidAppName !== "" ) {this.findSolidAppFolder(this.solidAppName);}
			this.checkAppFolder();
		}, err => {
			this.eventHandler("error", err+" webid")
		})

      })
  },
  /* async function login(){
alert("blabla");
    const session = await this.auth.currentSession()
	if( !session ) return await this.rs.popupLogin()
}, */


  checkAppFolder() {
  	  this.rs.readFolder(this.appRootUri).then( folder => {
						this.click = true;
						localStorage.setItem('appRootUri', this.appRootUri);
						if (this.appFile !== "/") { localStorage.setItem('appFileUri', this.appFileUri);}
						this.eventHandler("connected")
  		}, err => { alert(err.status)
			if ( this.userAddress.split("/",2).join('/') !== "https:/") {
				this.eventHandler("error", "404 (not an URL) "+this.userAddress)
  			}else if (err.status === 404) { //slice(0,3) == "404") {
  				let response = window.confirm("Error : "+err+"\n\nDo you allow creation of \n  "+this.appFolder+"\n  (need r/w access) ?");
				if(response)
				{
					this.rs.createFolder(this.appRootUri).then( res => {
						alert(this.appRootUri+"\n\nwas created");
						this.click = true;
						localStorage.setItem('appRootUri', this.appRootUri);
						if (this.appFile !== "/") { localStorage.setItem('appFileUri', this.appFileUri);}
						this.eventHandler("connected")
					}, err => { alert("not created "+err);
						this.eventHandler("error", err)
					})
				}else{
					alert("You choosed not to create "+this.appFolder)
					this.eventHandler("error", "404 (not found)\n"+this.appFolder+"\n (not created)");
				}
  			}else{
				this.eventHandler("error", err)
	    	}
		})
  },

  findSolidAppFolder(appName) {
//  	to be developped : find/create entry in type index including appFile/appFolder
  },
  
  setClickHandlers () {
    // Initial button
    this.rsInitial.addEventListener('click', () => this.setState('sign-in') );

    // Disconnect button
    this.rsDisconnectButton.addEventListener('click', () => { this.disconnect()} );

    // Reduce to icon only if connected and clicked outside of widget
    document.addEventListener('click', () => this.close() );

    // Clicks on the widget stop the above event
    this.rsWidget.addEventListener('click', e => e.stopPropagation() );

    // Click on the logo to toggle the widget's open/close state
    this.rsLogo.addEventListener('click', () => this.toggle() );
  },

  /**
   * Reset the widgets after disconnect.
   */
  disconnect() {
  	this.click = true;
	this.userAddress ="";
	localStorage.removeItem('appRootUri');
	localStorage.removeItem('appFileUri');
	this._auth.logout().then( res => console.log("logout"), err => console.log("logout "+err));
//	this._auth.logout().then( console.log("logout disconnect"))
    this.setInitialState();

    let msgContainer = document.querySelector('.rs-sign-in-error');
    msgContainer.innerHTML = "";
  	msgContainer.classList.remove('rs-visible');
    msgContainer.classList.add('rs-hidden');
	if ( this.click === true && this.windowReload === true) {/*alert("disconnect windowReload");*/ window.location.reload(true)}
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
      this.open();
      this.showErrorBox(error + " ");
      this.rsErrorBox.appendChild(this.rsErrorReconnectLink);
      this.rsErrorReconnectLink.classList.remove('rs-hidden');
  },
  
checkSession () {
  this._auth.currentSession().then(sess => {
  if (sess) return sess
  else {} //throw new Error("No current session")
  })
},

/*  async popupLogin() {
    let session = await this.auth.currentSession();
    if (!session) {
        let popupUri = 'https:/solidcommunity.net/common/popup.html';
        session = await this.auth.popupLogin({ popupUri });
    }
    return(session.webId);
  },

  async login(credentials) {
    var session
    try {
      session = await this.auth.currentSession();
      if(session) return session;
    }
    catch(err) {
        session = await this.auth.login(credentials);
        return session;
    }
        session = await this.auth.login(credentials);
        return session;
  },
*/
};

module.exports = Widget;
