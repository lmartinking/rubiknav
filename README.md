# RUBIKNAV

A sliding navigation thingie, as used by [lumaki.com](http://www.lumaki.com)

It also fires events which you can hook into for your own purposes. :-)

jQuery is required.

Rubiknav is licenced under the GPLv2.


## Events

### Event names

#### rn_init

This event is triggered when rubiknav loads.

The document body, and every piece of content receieves this event.


#### rn_current

This is triggered when a piece of content becomes current.


#### rn_leave

Triggered when the current content is no longer current.


#### rn_loading

The document body receieves this event when a subpage is loading.


#### rn_loaded

The document body receieves this event when a subpage has finished loading.


### Event Example

	jQuery("body").live("rn_init", function () {
		/* Some stuff here when rubiknav loads */
	});

	jQuery(".mycontentclass").live("rn_current", function () {
		$(this).append("Welcome to mycontent, again.");
	});
