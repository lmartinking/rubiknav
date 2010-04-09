# RUBIKNAV

A sliding navigation thingie, as used by [lumaki.com](http://www.lumaki.com)

It also fires events which you can hook into for your own purposes. :-)


## Events


### rn_init

This event is triggered when rubiknav loads.

The document body, and every piece of content receieves this event.


### rn_current

This is triggered when a piece of content becomes current.


### rn_leave

Triggered when the current content is no longer current.


### rn_loading

The document body receieves this event when a subpage is loading.


### rn_loaded

The document body receieves this event when a subpage has finished loading.