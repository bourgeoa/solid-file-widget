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
 * @param {object}  auth					         - solid-authorization-client instance
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
 * @param {string}  options.appFolder	     - Root folder of the app (default: '/public')
 * @param {string}  options.appFile		     - appFile of the app (default: "")
 * @param {string}  options.solidAppName   - solidAppName shall find 'appFolder' through podStorage.card (default: "")
 * @param {string}  options.popupUri       - popupUri default to https://solidcommunity.net/common/popup.html
 */

let Widget = function(auth, options={}) {
  this._auth = auth
  this.click = false; // true if click on button disconnect

  this.leaveOpen      = options.leaveOpen ? options.leaveOpen : false;
  this.autoCloseAfter = options.autoCloseAfter ? options.autoCloseAfter : 1500;
  this.skipInitial    = options.skipInitial ? options.skipInitial : false;
  this.logging        = options.logging ? options.logging : false;
  this.windowReload	  = options.windowReload ? options.windowReload : true;
  this.appFile		    = options.appFile ? options.appFile : "";
  this.appFolder	    = options.appFolder ? options.appFolder : "/public";  // with or without / at end
  this.solidAppName   = options.solidAppName ? options.solidAppName : "";
  this.popupUri       = options.popupUri ? options.popupUri : 'https://solidcommunity.net/common/popup.html'

  
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
          if (session) {					
            console.log("Logged in as "+session.webId+" "+this.userAddress);
            this.rsConnectedUser.innerHTML = localStorage.getItem('appRootUri');
            this.setBackendClass("remotestorage");
            this.rsConnectedLabel.textContent = "webId : "+session.webId.split("/")[2];
            this.setState('connected');
          } else { this.click === false; this.setState('disconnected') }
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
    style.innerHTML = require('raw-loader!./assets/styles.css');

    element.id = "remotestorage-widget";
    element.innerHTML = require('html-loader!./assets/widget.html');
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
		if(session) {
      if (localStorage.getItem('appRootUri') === null) {
        this.click = false;
        this.eventHandler("disconnected")
        this._auth.logout().then( res => console.log("logout"), err => console.log("logout "+err));
      }else{
      this.eventHandler("connected")
      }
		} else { this.eventHandler("disconnected") }
	})
    this.setEventListeners()
    this.setClickHandlers()
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
    this.rsSignInForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      this.userAddress = document.querySelector('input[name=rs-user-address]').value;
	    // test podStorage and set localstorage cookie
      await this._auth.logout()
      try {
        const session = await this.popupLogin()
        const webId = session.webId
        if ( this.userAddress != "") {
          this.userAddress = this.userAddress.split("/",3).join('/')
        } else {
          this.userAddress = webId.split("/",3).join('/')
        }
        if (this.appFolder.charAt(0) !== '/') {this.appFolder = "/" + this.appFolder }
        this.appRootUri = this.userAddress + this.appFolder
        if (this.appFile.charAt(0) !== '/') { this.appFile = "/"+this.appFile }
        this.appFileUri = this.userAddress + this.appFile
        if ( this.solidAppName !== "" ) { this.findSolidAppFolder(this.solidAppName) }
        this.checkAppFolder() 
      } catch(err) {
        this.eventHandler("error", err + " webid")
      }
    })
  },
  
  async popupLogin () {
  	try {
    const session = await this._auth.currentSession()
    if( !session ) return await this._auth.popupLogin({ popupUri: this.popupUri })
      return session
  	} catch(err) { alert(err) }
  },


  checkAppFolder() {
    this._auth.fetch(this.appRootUri, { method: 'HEAD' }).then(res => {
    	if (res.status === 200) {  
        this.click = true
        localStorage.setItem('appRootUri', this.appRootUri)
        if (this.appFile !== "/") { localStorage.setItem('appFileUri', this.appFileUri) }
        this.eventHandler("connected")
		    if ( this.userAddress.split("/",2).join('/') !== "https:/") {
		      this.eventHandler("error", "404 (not an URL) "+this.userAddress)
		    }
	    } else if (res.status === 404) {
	      let response = window.confirm("Error : "+res.statusText+"\n\nDo you allow creation of \n  "+this.appFolder+"\n  (need r/w access) ?");
	      if(response) {
	      	const slug = this.appRootUri.replace(/\/$/, '').replace(/.*\//, '')
	      	const folder = this.appRootUri.substring(0, this.appRootUri.lastIndexOf(slug))
	      	let options = {
	      		method: 'POST',
	      		headers: {
	      			link: '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
		      		slug: slug,
		      		'Content-Type': 'text/turtle'
	      		},
	      		body: ''
	      	}
	        this._auth.fetch(folder, options).then( res => {
	        	if (res.ok) {
	          alert(this.appRootUri+"\n\nwas created")
	          this.click = true
	          localStorage.setItem('appRootUri', this.appRootUri)
	          if (this.appFile !== "/") { localStorage.setItem('appFileUri', this.appFileUri) }
	          this.eventHandler("connected")
	        	} else {
				    	console.log('Authorization error '+res.statusText)
				      this.eventHandler("error", 'Authorization error '+res.statusText)
	        	}
	        }, err => {
	          this.eventHandler("error", err)
	        })
	      } else {
	        alert("You choosed not to create "+this.appFolder)
	        this.eventHandler("error", "404 (not found)\n"+this.appFolder+"\n (not created)")
	      }
	    } else {
	    	console.log('Authorization error ' + res.statusText)
	      this.eventHandler("error", 'Authorization error '+ res.statusText)
	    }
	  }, err => {
	    	console.log('Authorization error '+err)
	      this.eventHandler("error", 'Authorization '+err)
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
  	this.click = true
    this.userAddress =""
    localStorage.removeItem('appRootUri')
    localStorage.removeItem('appFileUri')
    localStorage.removeItem('appRootUriTo Create')
    this._auth.logout().then( res => console.log("logout"), err => console.log("logout "+err))
    this.setInitialState()

    let msgContainer = document.querySelector('.rs-sign-in-error')
    msgContainer.innerHTML = ""
  	msgContainer.classList.remove('rs-visible')
    msgContainer.classList.add('rs-hidden')
	if (this.click === true && this.windowReload === true) {/*alert("disconnect windowReload");*/ window.location.reload(true)}
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
        this.showChooseOrSignIn()
      } else {
        this.close()
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
}

module.exports = Widget
