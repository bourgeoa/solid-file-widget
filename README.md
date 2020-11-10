# solid-file-widget

<a href="http://badge.fury.io/js/solid-file-widget">![npm](https://badge.fury.io/js/solid-file-widget.svg)</a>

A ready-to-use connect/register widget for Solid webapp, as add-on library for
[node-solid-server](https://github.com/solid/node-solid-server).

-- registering to be done, but all parameters are fonctional --

## Returns cookies

If 'connected to the Solid pod' and after 'checking/creating appRootUri for appRoot'
(do not check/create appFileUri) returns localStorage cookies.

var uriRoot = localStorage.getItem(appRootUri);
var uriFile = localStorage.getItem(appFileUri);

## Usage


```javascript
const auth = require('solid-auth-client')
const Widget = require("solid-file-widget")
```
```HTML
<script src="https://cdn.jsdelivr.net/npm/solid-auth-client/dist-lib/solid-auth-client.bundle.js"></script>
<script type="text/javascript" src="../build/widget.js"></script>
<script>
const auth = solid.auth

// ...

var uriRoot = localStorage.getItem(appRoot);
var uriFile = localStorage.getItem(appFile);

const widget = new Widget(solidFile, {
	solidAppName : "appname",
	appFolder : "/public/foldername"
	});

widget.attach();

// ...
```

## Configuration

The widget has some configuration options to customize the behavior:

| Option | Description | Type | Default |
|---|---|---|---|
| `leaveOpen` | Keep the widget open when user clicks outside of it | Boolean | false |
| `autoCloseAfter` | Timeout after which the widget closes automatically (in milliseconds). The widget only closes when a storage is connected. | Number | 1500 |
| `skipInitial` | Don't show the initial connect hint, but show sign-in screen directly instead | Boolean | false |
| `logging` | Enable logging for debugging purposes | Boolean | false |
| `windowReload` | Browser reload on connect/disconnect | Boolean | true |
| `solidAppName` | app name registered in Solid pod TypeIndex | String | "" |
| `appFolder` | app root folder registered in Solid pod TypeIndex | String | from TypeIndex or '/public' |
| `appFile` | app file registered in Solid pod TypeIndex | String | from TypeIndex |
| `popupUri` | solidAuth popup default to : "https://solidcommunity.net/common/popup.html" | string |

## Available Functions

`attach(elementID)` - Attach the widget to the DOM and display it. You can
use an optional element ID that the widget should be attached to.
Otherwise it will be attached to the body.

While the `attach()` method is required for the widget to be actually
shown, the following functions are usually not needed. They allow for
fine-tuning the experience.

`close()` - Close/minimize the widget to only show the icon.

`open()` - Open the widget when it is minimized.

`toggle()` - Switch between open and closed state.

## Development / Customization

Install deps:

    npm install

Build, run and watch demo/test app:

    npm start

The demo app will then be served at http://localhost:8008

## Acknowledgements

Many thanks for inspiration from https://github.com/remotestorage/remotestorage-widget
and from https://github.com/jeff-zucker/solid-file-client

**copyright (c) 2019 Alain Bourgeois** may be freely used with MIT license
