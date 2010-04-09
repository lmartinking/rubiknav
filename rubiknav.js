/*
 * Rubiknav - a sliding navigation thingie
 *
 * by Lucas Martin-King
 */
jQuery(document).ready( function () {
function rubiknav($) {
	if ($.browser.msie) {
		/* At this stage, MSIE doesn't work with Rubiknav very well,
		   so we won't bother until I have the time to hack it for IE */
		return;
	}
	
	$('.rubiknav-content').hide();  /* quickly hide it to stop flashing! */
 
	/******************************************************************************************/
	/*** SETTINGS ***/
	/******************************************************************************************/
	var rn_settings = {
		css_path : false,	/* needs to be an absolute path, or false */
		
		anim_speed : 500,
		
		title_prefix : "",
		title_separator : " :: ",
		title_postfix : " :: lumaki",
		title_filter : function (str) { return str.toLowerCase(); },
		
		default_target : 4,
		
		scroll_to : true,		/* set to true if you want the scrolly effect */
                hover_enabled : true		/* set to true if you want the hover effect */
	};

	/******************************************************************************************/

	var scrolly = false;			/* jQuery object */
	var scrolly_item = new Array();
	
	var item_current = 0;			/* item id */
	var item_previous = 0;			/* item id */
	
	var menu_item = new Array();		/* holds jQuery objects */
	var menu_item_title = new Array();
	var menu_pong = false;

	var hover = false;
	var overlay = false;
	
	/******************************************************************************************/

	var d_win = false;
	function debug(string) {
/*		if (d_win == false) {
			d_win = $("<pre id='d_win'></pre>");
			$('body').append( $(d_win) );
			$(d_win).css( {
				'font-family': 'monospace',
				'position': 'absolute',
				'display': 'block',
				'top': '0',
				'left': '0',
				'background': '#ababab',
				'width': '300px',
				'overflow': 'scroll',
				'height': '600px'
			});
		}
		
		$(d_win).append(string + "\n");	*/
	}
	
       /* Insert the code for the stylesheet into the document */
       function insert_stylesheet () {
		if (rn_settings.css_path !== false) {
			debug("insert_stylesheet()");	
			var str = '<link rel="stylesheet" href="' + rn_settings.css_path + '"/>';
			$('head').append(str);
		}
	}
	
	function insert_scrolly () {
		debug("insert_scrolly()");	
		$('.rubiknav-content').append('<div class="rubiknav-scrolly"></div>');
		scrolly = $('.rubiknav-scrolly');
		$(scrolly).css('position', 'relative');
		$(scrolly).css('left', '0').css('top', '0');
	}

	function insert_hover () {
                if (rn_settings.hover_enabled) {
                     hover = $('<div class="rubiknav-hover"></div>');
                     $(hover).hide();
		     $('body').append( $(hover) );
              }
	}
	
	function insert_overlay () {
		overlay = $('<div class="rubiknav-overlay"></div>');
		/* $(overlay).hide(); */
		$('body').append( $(overlay) );
		
		$(overlay).bind("rn_overlay_hide", function () {
			update_browser(item_current);
		} );

		window.onresize = function () {
			if ( $(overlay).is(":visible") ) {
				overlay_set_position();
			}
		};
		
		return;
	}
	
	function scrolly_item_trigger (iindex, event) {
		$(scrolly_item[iindex]).children().trigger(event);
	}
	
	function scrolly_add_item (iindex, icontent) {
		$(scrolly).append('<div class="rubiknav-scrolly-item rubiknav-scrolly-item-' + iindex + '" id="rubiknav-scrolly-item-' + iindex + '">' + icontent + '</div>');
		scrolly_item[iindex] = $('.rubiknav-scrolly-item-'+iindex);
		$('.rubiknav-scrolly-item-'+iindex).attr("_rn_id", iindex);
	}
	
	function scrolly_add_item_iframe (iindex, ihref) {
		var content = '<iframe class="rubiknav-scrolly-item-iframe" src="' + ihref + '"/>';
		scrolly_add_item(iindex, content);
		scrolly_item_trigger(iindex, "rn_init");
	}

	function sanitise_children_of (parent) {
		$(parent).children().each( function () {		
			$(this).attr("_id", $(this).attr("id"));
			$(this).removeAttr("id");
			$(this).removeClass("current");
		} );
	}
	
	function scrolly_add_item_self (iindex, ihref) {
		scrolly_add_item(iindex, "");
		$("#rubiknav-scrolly-item-" + iindex).append( $(ihref) );
		sanitise_children_of("#rubiknav-scrolly-item-" + iindex);
		$(scrolly_item[iindex]).attr('_rn_href', ihref);
		scrolly_item_trigger(iindex, "rn_init");	
	}
	
	function on_scrolly_add_item_ajax_load (responseText, textStatus, XMLHttpRequest) {	
		if (textStatus != "success" || responseText == "") {
			$(this).text("");
			$(this).append("<p class='rubiknav-failure'>Ajax loading failed!</p>");
			/* alert(XMLHttpRequest); */
			$(this).children().fadeIn();
		} else {
			/* sanitise children to avoid id clashing */
			sanitise_children_of(this);
			$(this).children().fadeIn();
			$(this).children().trigger("rn_init");
		}
	}
	
	function scrolly_add_item_ajax (iindex, ihref) {
		scrolly_add_item(iindex, "&nbsp;"); /* placeholder until ajax loads */
		$(scrolly_item[iindex]).attr('_rn_href', ihref);
		//alert("add_item_ajax ihref: " + ihref);
		scrolly_item_href(iindex, ihref);
		$("#rubiknav-scrolly-item-" + iindex).load(ihref, on_scrolly_add_item_ajax_load);
	}

	function scrolly_item_position (iindex) {
		var item = scrolly_item[iindex];
		var pos = $(item).position();
		return pos;
	}

	function scrolly_set_item_current (idx) {		
		$(scrolly_item[item_current]).children(".content").removeAttr("id");
		$(scrolly_item[item_current]).children(".content").removeClass("current");		
		
		item_previous = item_current;
		item_current = idx;
		
		var new_id = $(scrolly_item[item_current]).children(".content").attr("_id");
		$(scrolly_item[item_current]).children(".content").attr("id", new_id); /* restore original id */
		$(scrolly_item[item_current]).children(".content").addClass("current");
		
		setTimeout( function () { scrolly_item_trigger(item_previous, "rn_leave"); }, 1);
		setTimeout( function () { scrolly_item_trigger(item_current, "rn_current"); }, rn_settings.anim_speed * 2);
	}
	
	function scrolly_item_href (idx, href) {
		var item = menu_item[idx];
		
		if (href === undefined) {
			return $(item).attr("_rn_href");	
		} else {
			return $(item).attr("_rn_href", href);
		}
	}
	
	/******************************************************************************************/
	/*** SCROLLY VIEW CONTROL ***/
	/******************************************************************************************/
	
	function scrolly_view_item (iindex) {
		if (typeof(iindex) == "undefined") {
			return;
		}
	
		oldspeed = rn_settings.anim_speed;
		rn_settings.anim_speed = 0;
		
		/* var id = menu_lookup_id(item); */
		menu_pong_scrollto_item(iindex);
		scrolly_scrollto_item(iindex);
		
		rn_settings.anim_speed = oldspeed;
	}
	
	function scrolly_scrollto_item (iindex) {
		var c_left = $(scrolly).css('left');
		var c_top = $(scrolly).css('top');
		var pos = scrolly_item_position(iindex);
		
		var left = -pos.left;
		var top = -pos.top;
		
		if (left != c_left) {
			$(scrolly).animate( { left: left }, rn_settings.anim_speed );
		}
		
		if (top != c_top) {
			$(scrolly).animate( { top: top }, rn_settings.anim_speed );
		}
		
		scrolly_set_item_current(iindex);
	}
	
	/******************************************************************************************/
	/*** LET'S PLAY PONG! ***/
	/******************************************************************************************/
	
	function insert_menu_pong () {
		menu_pong = $('<div class="rubiknav-menu-pong"/>');
		$(menu_pong).appendTo(".rubiknav-menu");
		$(menu_pong).css('position', 'relative');
		$(menu_pong).css('top', '0');
		$(menu_pong).css('left', '0');
	}

	function menu_pong_scrollto_item (iindex) {
		var c_left = $(menu_pong).css('left');
		var c_top = $(menu_pong).css('top');
		var pos = $(menu_item[iindex]).position();
		
		var mpos = $('.rubiknav-menu').position();
		
		var left = pos.left - mpos.left;
		var top = pos.top - mpos.top;
		
		if (left != c_left) {
			$(menu_pong).animate( { left: left }, rn_settings.anim_speed );
		}
		
		if (top != c_top) {
			$(menu_pong).animate( { top: top }, rn_settings.anim_speed );
		}
	}
	
	/******************************************************************************************/
	
	function menu_lookup_id (item) {
		return $(item).attr('_rn_idx');
	}
	
	function scrolly_item_title (id) {
		return menu_item_title[id];
	}
	
	function update_browser (id, subtitle, noupdatehash) {
		if (subtitle === undefined) {
			subtitle = "";
		}
	
		var extra = "";

		if (subtitle !== "") {
			extra = subtitle + rn_settings.title_separator;
		}

		document.title = rn_settings.title_prefix + extra + scrolly_item_title(id) + rn_settings.title_postfix;
		
		if (noupdatehash === undefined) {
			window.location.hash = scrolly_item_title(id);
		}
	}
	
	/******************************************************************************************/

	function overlay_set_size() {
		var h = $('.rubiknav-content').height();
		var w = $('.rubiknav-content').width();
		
		$(overlay).width(w).height(h);
	}
	
	function overlay_set_position () {
		var pos = $('.rubiknav-content').offset();
		
		$(overlay).css( { top: pos.top, left: pos.left } );
	}
	
	function overlay_set_content (method, href) {
		/*
		console.log("overlay_set_content( ) method: " + method + " href: " + href);	
		$(overlay).trigger("rn_overlay_hide");
		$(overlay).children().fadeOut();
		*/

		$(overlay).children('.content').fadeOut();

		/* If we have already loaded the contents, then no need to load them again! */
		/*if ($(overlay).attr("_rn_href") == href) {
			$(overlay).fadeIn();
			$(overlay).children(".content").fadeIn();
			return;
		}*/
		
			
		/* alert("inside?");
		$(overlay).children().hide( function () { $(overlay).trigger("rn_overlay_hide").empty(); } ); */
		
		$(overlay).attr("_rn_href", href);
		/* alert("href: " + href) */

		$("body").trigger("rn_loading");

		if (method == 'ajax') {
			var newcontent = $('<div></div>');
			$(newcontent).load( href, function (responseText, textStatus, XMLHttpRequest) {			
				if (textStatus != "success" || responseText == "") {
					$(overlay).empty();
					$(overlay).append("<p class='rubiknav-failure'>Ajax loading failed! "+ href +"</p>");
					$(overlay).fadeIn();
				} else {
					$(newcontent).children().hide();
					setTimeout( function () {

						$(overlay).empty().trigger("rn_overlay_show").fadeIn();	
						sanitise_children_of( $(newcontent) );
						
						$(newcontent).children().appendTo( $(overlay) );
						//$(overlay).children().trigger("rn_init");
						$(overlay).children(".content").addClass("current").fadeIn();
						$(overlay).children().trigger("rn_current");					
							
						var h = $(overlay).attr("_rn_href");
						h = h.toString().replace(' #content', '');
						if (h.charAt(0) == '/') { h = h.substr(1); }
						window.location.hash = h;
					
						var t = $(overlay).find("h1").first().text();
						update_browser( item_current, rn_settings.title_filter(t), true);

						$("body").trigger("rn_loaded");
						/* TRIGGER */
					}, 500);	
				}
			} );
		} else if (method == 'iframe') {
			$(overlay).empty();
			var iframe = $("<iframe></iframe>");
			$(iframe).attr('src', href);
			$(iframe).css('border', 'none');
			$(iframe).width( $(overlay).width() ).height( $(overlay).height() ).hide();
			setTimeout( function () {
				$(overlay).append( $(iframe) );
				$(iframe).fadeIn();
			}, 500 );
		} else if (method == 'self') {
			/* TODO: implement self loading method */
		}
	}

	/******************************************************************************************/
	/*** MENU CALLBACKS ***/
	/******************************************************************************************/
	
	function on_menu_item_click (item) {		
		$(hover).hide();
		
		var id = menu_lookup_id(item);
		var overlay_visible = $(overlay).is(":visible");
		
		if (!overlay_visible && ( typeof(id) == "undefined" || id == item_current )) {
			return false;	/* don't need to trigger a change since we're already here! */
		} else if (overlay_visible) {
			$(overlay).trigger("rn_overlay_hide").fadeOut();
			if ( typeof(id) == "undefined" || id == item_current ) {
				return false;	/* don't need to trigger a change since we're already here! */
			}
		}
		
		var delay = 0;
		if (overlay_visible) { delay = 500; }
		
		setTimeout( function () {
			if (rn_settings.scroll_to) {
				scrolly_scrollto_item(id);
			} else {
				scrolly_view_item(id);
			}
			
			menu_pong_scrollto_item(id);
			
			setTimeout(function () {
				update_browser(id);
			}, (rn_settings.anim_speed + 200) );					
		}, delay);
		
		return false;
	}
	
	function on_menu_item_hover_over (item) {
		/* alert("X: " + pos.top + " Y: " + pos.left ); */
		var title = scrolly_item_title( menu_lookup_id(item) );
		
		$(hover).text( title );
		
		var pos = $(item).offset();
		var con = $('.rubiknav-content').offset();
		
		/* $(hover).css( { top: pos.top, left: pos.left } ).show(); */
		$(hover).css( { top: pos.top, left: con.left } ).show();
	}
	
	function on_menu_item_hover_out (item) {
		return;
	}
	
	function on_menu_hover_over (m) {
		if ($(hover).is(":visible") !== true) { 
			var pos = $('.rubiknav-content').offset();
			$(hover).css( { left: pos.left } ).show();
		}
	}
	
	function on_menu_hover_out (m) {
		$(hover).hide();
	}
	
	function on_content_anchor_click (obj) {
		//alert("content link clicked!");	
		var r_href = $(obj).attr('href');
		var r_rel = $(obj).attr('rel');
		var r_target = $(obj).attr("_target");
		var url = r_href.parseURL();
		
		//alert("href: " + r_href + " rel: " + r_rel + " target: " + r_target);
		
		if ( (r_rel == 'external' || url.host !== undefined) && r_rel !== 'internal' ) {
			return;
		}
			
		var want_self = 0;
		
		r_href = r_href.toString().replace("#"," #");
		var n_href = new Array();
		n_href = r_href.split(" ");
			
		var end = 0;
			
		/* if ( $(this).attr('rel') == "rubiknav") { */
		$('.rubiknav-menu li').each( function () {
			var href = $(this).attr("_rn_href");
			href = href.replace("/ #", " #");
			r_href = r_href.replace("/ #"," #");
				
			//alert("r_href: '" + r_href + "' href: '" + href + "'");
			
			var item = this;
			
			if (href == r_href) {
				//alert('match!');
				setTimeout( function () { $(item).trigger('click'); }, 100);
				end = 1;
				return false;
			}
			
			return;
		});
				
		if (end == 1) { return false; }
			
		if ( n_href[0] == "" && n_href[1].match("#") ) {
			want_self = 1;
			r_href = n_href[1];
			/* alert("overlay self!"); */
			return false;
		} else {
			debug("overlay ajax: " + r_href);
			
			var method = 'ajax';
			
			if (! $(overlay).is(':visible')) {
				overlay_set_position();
				overlay_set_size();					
			}
			if (r_target == 'iframe') {
				method = 'iframe';
			}
			overlay_set_content(method, r_href);
			
			return false;
		}		
	}
	/******************************************************************************************/
	/*** INITIALISATION ***/
	/******************************************************************************************/
	
	function init_hooks () {
		$('.rubiknav-menu').children().each( function () {
			/* alert("Item!"); */
			
			menu_item.push(this);
			
			$(this).click( function () {
				return on_menu_item_click(this);
			} );
			
			if (rn_settings.hover_enabled) {
			$(this).hover( function () {
				on_menu_item_hover_over(this);
				}, function () {
				on_menu_item_hover_out(this);
				} );
			}
		} );
		$('.rubiknav-menu').hover ( function () {
			on_menu_hover_over(this);
		}, function () {
			on_menu_hover_out(this);
		} );
		
		$('.rubiknav-content a, .rubiknav-overlay a').live ('click', function () {
			return on_content_anchor_click(this);
		});

		$("a[rel='rubiknav']").live ('click', function () {
			return on_content_anchor_click(this);
		} );
	}
	
	function init_menu () {
		var idx = 0;
	
		/* $('.rubiknav-menu li *').hide(); */
	
		$('.rubiknav-menu').children().each( function () {
			var r_href;
			var want_iframe = 0;
		
			$(this).children("a").each( function () {
				r_href = $(this).attr("href");
				
				if ($(this).attr("rel") == "iframe") {
					want_iframe = 1;
				}
				
				if ($(this).attr("title")) {
					/* alert("title is: " + $(this).attr("title")); */
					menu_item_title.push($(this).attr("title"));
				} else {
					menu_item_title.push("");
				}
				
				$(this).replaceWith($(this).html());
			} );
			
			if (typeof(r_href) != "undefined") {		
				var want_self = 0;
				
				r_href = r_href.toString().replace("#"," #");
				var n_href = new Array();
				n_href = r_href.split(" ");
				
				/* alert("n_href: '" + n_href[0] + "'"); */
				
				if ( n_href[0] == "" && n_href[1].match("#") ) {
					want_self = 1;
					r_href = n_href[1];
				}
				
				/* alert("Has anchor! href is: " + r_href); */
				
				if (want_self) {
					scrolly_add_item_self(idx, r_href);
				} else if (want_iframe) {
					scrolly_add_item_iframe(idx, r_href);
				} else {
					scrolly_add_item_ajax(idx, r_href);
				}
				
				$(this).attr('_rn_idx', idx);
				$(this).attr('_rn_href', r_href);
				
				idx = idx + 1;	
			}
		} );
	}
	
	function init_current () {
		$('body').trigger("rn_init");
	
		setTimeout( function () {
			var target = rn_settings.default_target;
			var overlay_target;
		
			var url = window.location.toString().parseURL();
		
			for (var id in menu_item) {
				var title = scrolly_item_title(id);
				
			/*	alert(url.host);
				
				var h1 = window.location.hash.toString().split("#");
				var h2 = window.location.hash.toString().split("/");
				
				debug("h1: '" + h1.toString() + "' h2: '" + h2.toString() + "'");
			*/
				
				var h = window.location.hash.toString().split("/");
				
				/* if (h[0] == '#') { h.splice(0, 1); } */
				
				for (var i in h) {
					if ( h[i] == '#') {
						h.splice(i, 1);
					} else if ( h[i].charAt(0) == '#') {
						h[i] = h[i].substring(1);
					}
				}
				
				/* First, we use the actual path, and if it's not /, we go straight there,
				 * ignoring the hash since we don't want to confuse people */
				if ( url.path !== '/' /* && h.length <= 1 && h[0] == '' */){
					var p = url.path.toString().split("/");
					var parent = p[1];
					
					//alert("path: " + url.path +  " p[0] is: " + p[1] + " title is: " + title);
					if (parent == title) {
						target = id;
						var ptrim = url.path.replace("/","");
						
						//alert( ("/"+parent+"/") + " == " + url.path );
						
						if ( ("/"+parent+"/") != url.path ) {
							overlay_target = url.path.substring(1);
							$(".rubiknav-content #content").remove();
						}
						
						//alert("target: " + target + " overlay: " + overlay_target);
						break;
					}
				} else
				/* Go straight to the target if just a parent page. eg: /#cdogs */
				if ( h.length == 1 && title == h[0] )  {
					/* alert("path: " + url.path + " query: " + url.query + " fragment: " + url.fragment); */
					target = id;
					break;
				} else
				/* Go to the parent page, and load the subpage in the overlay
				 * eg: /#cdogs/screenshots
				 */
				if (h.length > 1 && h[0] == title) {
					/* alert("sub page!"); */
					var l = h; //l.shift();
					overlay_target = l.join('/');
					target = id;
					//alert("Overlay: " + overlay_target);
					 break;
				}
			}
			
			/*
			overlay_set_size();
			overlay_set_position();
			$(overlay).show();
			*/

			$(".rubiknav-content").show( function () {
				setTimeout( function () {
					scrolly_view_item(target); 
					$(menu_pong).show();
					update_browser(target);
			
					if (overlay_target === undefined ) {
						setTimeout( function () { $(overlay).fadeOut(); }, 200);		
					} else {
						overlay_set_position();
						overlay_set_size();
						/* $(overlay).append("Target: " + overlay_target); */
						overlay_set_content('ajax', "/" + overlay_target + " #content");
					}
				}, 200);	
			} );			
		}, 200 ); /* magic delay required */	
	}
	
	/******************************************************************************************/
	
	insert_stylesheet();
	
	insert_menu_pong();
	insert_scrolly();
	
	insert_hover();
	insert_overlay();
	
	init_menu();
	init_hooks();
	
	init_current();
 }

rubiknav(jQuery);
 
/* End of jQuery wrapping */ 
 } );
/* End of file */

/* parseURL() */
String.prototype.parseURL = function(query) {
	var url=this,
		rx=/^((?:ht|f|nn)tps?)\:\/\/(?:([^\:\@]*)(?:\:([^\@]*))?\@)?([^\/]*)([^\?\#]*)(?:\?([^\#]*))?(?:\#(.*))?$/,
		rg=[null,'scheme','user','pass','host','path','query','fragment'],
		r=url.match(rx),i,q,ret={};
	if (r === null) { return ret; }
	
	for (var i = 1; i < rg.length; i++) {
		if (r[i] !== undefined) {
			ret[rg[i]]=r[i];        
		}
	}
	
	if (ret.path == '') { ret.path='/'; }
	
	if (query !== undefined && r[6] !== undefined) {
		var i;
		var qu=r[6];
		ret.query={};
		qu=qu.split('&');
		for (var i=0; i<q.length; i++) {
			qu[i]=qu[i].split('=',2);
			ret.query[unescape(qu[i][0])] = unescape(qu[i][1]);
		}
	}
	
	return ret;
};
