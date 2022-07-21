( () => {
	const events = [
		'keydown',
		'mousedown',
		'mousemove',
		'touchend',
		'touchmove',
		'touchstart',
		'wheel',
	];

	const passive = { 'passive': true }; // Saves GPU in interaction

	const delayed_clicks = [];

	const delayed_scripts = { 'normal': [], 'async': [], 'defer': [] };

	const jquery_scripts = [];

	let is_dom_ready = false;

	let timestamp;

	// TODO: Not needed?
	//window.addEventListener( 'DOMContentLoaded', load_delayed_scripts );

	// TODO: _addUserInteractionListener
	if ( document.visibilityState === 'hidden' ) {
		load_all();
	} else {
		main_listeners( 'add' );
		// TODO: touchstart, mousedown -> handle_touch
		//window.addEventListener( 'mousedown', handle_click_and_touch );
		//window.addEventListener( 'touchstart', handle_click_and_touch, passive );
		click_listeners( 'add' );
	}

	// TODO: _removeUserInteractionListener
	function main_listeners( action ) {
console.log('MAIN LISTENERS', action)
		action = listener_action( action );
		for ( const event of events ) {
			window[ action ]( event, load_all, passive );
		}
		document[ action ]( 'visibilitychange', load_all );
	}

	function listener_action( action = 'remove' ) {
		action = 'add' === action ? 'add' : 'remove';
		return action + 'EventListener';
	}

	function click_listeners( action ) {
console.log('CLICK LISTENERS', action)
		action = listener_action( action );
		window[ action ]( 'mousedown', followup_listener );
		window[ action ]( 'touchstart', followup_listener, passive );
	}

	// TODO: _onTouchStart, toushStartHandler
	// TODO: _onTouchMove, TouchMoveHandler
	// TODO: _onTouchEnd, touchEndHandler
	function followup_listener( event ) {
		let action;
		let click_attribute;
		let new_click_attribute;
		if ( ['mousedown', 'touchstart'].includes( event.type ) ) {
			if ( event.target.tagName === 'HTML' ) {
				return;
			}
			action = 'add';
			click_attribute = 'onclick';
			new_click_attribute = 'litespeed-onclick';
		} else if ( ['mousemove', 'touchmove'].includes( event.type ) ) {
			action = 'remove';
			click_attribute = 'litespeed-onclick';
			new_click_attribute = 'onclick';
		}
console.log('FOLLOWUP LISTENER', action ? action : 'remove')
		action = listener_action( action );

		const new_events = ['mousemove', 'mouseup', 'touchend', 'touchmove'];
		for ( const new_event of new_events ) {
			const maybe_passive = 'touchmove' === new_event ? passive : undefined;
			window[ action ]( new_event, followup_listener, maybe_passive );
		}

		if ( typeof click_attribute === 'undefined' ) {
			return;
		}
		event.target[ action ]( 'click', click_listener );
		rename_attribute( event.target, click_attribute, new_click_attribute );
console.log('ONCLICK', new_click_attribute)
	}

	// TODO: _onClick, clickHandler
	function click_listener( event ) {
console.log('CLICK LISTENER add/remove')
		event.target.removeEventListener( 'click', click_listener );
		delayed_clicks.push( event );
		event.preventDefault();
		event.stopImmediatePropagation();
		event.stopPropagation();
	}

	function rename_attribute( element, from, to ) {
		try {
			const value = element.getAttribute( from );
			if ( value ) {
				element.setAttribute( to, value );
				element.removeAttribute( from );
			}
		} catch {}
	}

	// TODO: userEventHandler, _triggerListener
	function load_all() {
		console.log( '[LiteSpeed] Start Load JS Delayed' );
		main_listeners( 'remove' );
		// Handle iFrames
		const iframes = document.querySelectorAll( 'iframe[data-litespeed-src]' );
		for ( const iframe of iframes ) {
			iframe.setAttribute( 'src', iframe.getAttribute( 'data-litespeed-src' ) );
		}
		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', do_load_all );
		} else {
			do_load_all();
		}
	}

	// TODO: _loadEverythingNow
	async function do_load_all() {
		timestamp = Date.now();
		delay_listeners();
		delay_jquery();
		// TODO
		load_delayed_scripts();
		// TODO
//		do_clicks();
	}

	// TODO: _delayEventListeners
	function delay_listeners() {
		const elements = {};

		const redefine_functions = ( element, event ) => {
			if ( ! ( element in elements ) ) {
				elements[ element ] = {
					'events': [],
					'addEventListener': element.addEventListener,
					'removeEventListener': element.removeEventListener,
				};
				for ( let action of ['add', 'remove'] ) {
					action += 'EventListener';
					element[ action ] = function ( event ) {
						arguments[0] = elements[ element ].events.includes( event )
							? 'litespeed-' + event
							: event;
						elements[ element ][ action ].apply( element, arguments );
					}
				}
			}
			elements[ element ].events.push( event );
		};

		const redefine_properties = ( element, event ) => {
			const new_event = element[ event ];
			Object.defineProperty( element, event, {
				'get': () => typeof new_event === 'undefined' ? function () {} : new_event,
				set( value ) { element[ 'litespeed' + event ] = new_event = value; },
			} );
		};

		redefine_functions( document, 'DOMContentLoaded' );
		redefine_functions( document, 'readystatechange' );
		redefine_properties( document, 'onreadystatechange' );

		redefine_functions( window, 'DOMContentLoaded' );
		redefine_functions( window, 'load' );
		redefine_functions( window, 'pageshow' );
		redefine_properties( window, 'onload' );
		redefine_properties( window, 'onpageshow' );
	}

	// TODO: _delayJQueryReady
	function delay_jquery() {
		let jQuery = window.jQuery;
		Object.defineProperty( window, 'jQuery', {
			get: () => jQuery,
			set( script ) {
				if ( script?.fn && ! jquery_scripts.includes( script ) ) {
					script.fn.ready = script.fn.init.prototype.ready = function ( fun ) {
						fun = fun.bind( document );
						if ( is_dom_ready ) {
							return fun( script );
						}
						document.addEventListener(
							'litespeed-DOMContentLoaded',
							() => fun( script ),
						);
					};
					const on = script.fn.on;
					script.fn.on = script.fn.init.prototype.on = function ( event ) {
						if ( this[0] === window ) {
							const rename = ( key ) =>
								key
									.split( ' ' )
									.map( ( part ) => 'load' === part || part.indexOf( 'load.' ) === 0
										? 'litespeed-jqueryload'
										: part,
									)
									.join( ' ' );
							if ( typeof event === 'string' || ( event instanceof String ) ) {
								arguments[0] = rename( event );
							} else if ( typeof event === 'object' ) {
								for ( key of Object.keys( event ) ) {
									delete Object.assign(
										event,
										{ [ rename( key ) ]: event[ key ] },
									)[ key ];
								}
							}
						}
						return fun.apply( this, arguments );
					};
					jquery_scripts.push( script );
				}
				jQuery = script;
			},
		} );
	}

	// TODO: _preconnect3rdParties, ...
	async function load_delayed_scripts() {
		// Prepare all scripts
		const scripts =
			document.querySelectorAll( 'script[type="litespeed/javascript"]' );
		for ( const script of scripts ) {
			// Load in sequence
			await new Promise( ( resolve ) => load_delayed_script( script, resolve ) );
		}
		// Simulate `document.loaded`
		document.dispatchEvent( new Event( 'DOMContentLiteSpeedLoaded' ) );
		window.dispatchEvent( new Event( 'DOMContentLiteSpeedLoaded' ) );
	}

	/**
	 * Load one script synchronously
	 */
	function load_delayed_script( script, resolve ) {
		console.log( '[LiteSpeed] Load ', script );
		// Create a new script node
		const new_script = document.createElement( 'script' );
		for ( const event of ['error', 'load'] ) {
			new_script.addEventListener( event, resolve );
		}
		for ( const name of script.getAttributeNames() ) {
			if ( 'type' !== name ) {
				new_script.setAttribute(
					'data-src' === name ? 'src' : name,
					script.getAttribute( name ),
				);
			}
		}
		new_script.type = 'text/javascript';
		// Handle inline script
		if ( ! new_script.src && script.textContent ) {
			new_script.textContent = script.textContent;
			resolve();
		}
		// Deploy new script to DOM
		try {
			script.replaceWith( new_script );
		} catch {
			resolve();
		}
	}

	// TODO: _replayClicks
	function do_clicks() {
console.log('DO CLICKS')
		click_listeners( 'remove' );
		for ( const event of delayed_clicks ) {
			const options = { 'bubbles': true, 'cancelable': true, 'view': event.view };
			event.target.dispatchEvent( 'click', options );
		}
	}
} )();



/*
		// Handle inline script
		let is_inline = false;
		if ( ! new_script.src && script.textContent ) {
			new_script.src = inline_to_source( script.textContent );
			is_inline = true;
		}
		// Deploy new script to DOM
		try {
			script.replaceWith( new_script );
		} catch {
			resolve();
		}
		// Resolve inline script
		if ( is_inline ) {
			resolve();
		}
	}

	/**
	 * Prepare inline script
	 * /
	function inline_to_source( data ) {
		try {
			const url_creator = window.URL || window.webkitURL;
			const blob = new Blob(
				[ data.replace( /^(?:<!--)?(.*?)(?:-->)?$/gm, '$1' ) ],
				{ type: 'text/javascript' },
			);
			return url_creator.createObjectURL( blob );
		} catch {
			const blob = btoa( data.replace( /^(?:<!--)?(.*?)(?:-->)?$/gm, '$1' ) );
			return `data:text/javascript;base64,${blob}`;
		}
	}
*/



/*
const litespeed_ui_events = [
	'mouseover',
	'click',
	'keydown',
	'wheel',
	"touchmove",
	"touchstart",
];
var urlCreator = window.URL || window.webkitURL;

// const litespeed_js_delay_timer = setTimeout( litespeed_load_delayed_js, 70 );

litespeed_ui_events.forEach( e => {
	window.addEventListener(e, litespeed_load_delayed_js_force, {passive: true}); // Use passive to save GPU in interaction
} );

function litespeed_load_delayed_js_force() {
	console.log( '[LiteSpeed] Start Load JS Delayed' );
	// clearTimeout( litespeed_js_delay_timer );
	litespeed_ui_events.forEach( e => {
		window.removeEventListener(e, litespeed_load_delayed_js_force, {passive: true});
	} );

	document.querySelectorAll('iframe[data-litespeed-src]').forEach( e => {
		e.setAttribute('src', e.getAttribute('data-litespeed-src'));
	} );

	// Prevent early loading
	if ( document.readyState == 'loading' ) {
		window.addEventListener('DOMContentLoaded', litespeed_load_delayed_js);
	}
	else {
		litespeed_load_delayed_js();
	}
}

async function litespeed_load_delayed_js() {
	let js_list = [];
	// Prepare all JS
	document.querySelectorAll('script[type="litespeed/javascript"]').forEach( e => {
		js_list.push(e);
	} );

	// Load by sequence
	for ( let script in js_list ) {
		await new Promise(resolve => litespeed_load_one(js_list[script], resolve));
	}

	// Simulate doc.loaded
	document.dispatchEvent(new Event('DOMContentLiteSpeedLoaded'));
	window.dispatchEvent(new Event('DOMContentLiteSpeedLoaded'));
}

/**
 * Load one JS synchronously
 * /
function litespeed_load_one(e, resolve) {
	console.log('[LiteSpeed] Load ', e);

	var e2 = document.createElement('script');

	e2.addEventListener('load', resolve);
	e2.addEventListener('error', resolve);

	var attrs = e.getAttributeNames();
	attrs.forEach( aname => {
		if ( aname == 'type' ) return;
		e2.setAttribute(aname == 'data-src' ? 'src' : aname, e.getAttribute(aname));
	} );
	e2.type = 'text/javascript';

	let is_inline = false;
	// Inline script
	if ( ! e2.src && e.textContent ) {
		e2.src = litespeed_inline2src(e.textContent);
		// e2.textContent = e.textContent;
		is_inline = true;
	}

	// Deploy to dom
	e.after(e2);
	e.remove();
	// document.head.appendChild(e2);
	// e2 = e.cloneNode(true)
	// e2.setAttribute( 'type', 'text/javascript' );
	// e2.setAttribute( 'data-delayed', '1' );

	// Kick off resolve for inline
	if ( is_inline ) resolve();
}

/**
 * Prepare inline script
 * /
function litespeed_inline2src( data ) {
	try {
		var src = urlCreator.createObjectURL( new Blob( [ data.replace( /^(?:<!--)?(.*?)(?:-->)?$/gm, "$1" ) ], {
			type: "text/javascript"
		}));
	} catch (e) {
		var src = "data:text/javascript;base64," + btoa( data.replace( /^(?:<!--)?(.*?)(?:-->)?$/gm, "$1" ) );
	}

	return src;
}
*/
