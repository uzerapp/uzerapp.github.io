( function( $, window, undefined ) {
	
	'use strict';

	var $event = $.event,
	$special,
	resizeTimeout;

	$special = $event.special.debouncedresize = {
		setup: function() {
			$( this ).on( "resize", $special.handler );
		},
		teardown: function() {
			$( this ).off( "resize", $special.handler );
		},
		handler: function( event, execAsap ) {
			var context = this,
				args = arguments,
				dispatch = function() {
					event.type = "debouncedresize";
					$event.dispatch.apply( context, args );
				};

			if ( resizeTimeout ) {
				clearTimeout( resizeTimeout );
			}

			execAsap ?
				dispatch() :
				resizeTimeout = setTimeout( dispatch, $special.threshold );
		},
		threshold: 20
	};

	var $window = $( window ),
		$document = $( document ),
		Modernizr = window.Modernizr;

	$.Slitslider = function( options, element ) {
		
		this.$elWrapper = $( element );
		this._init( options );
		
	};

	$.Slitslider.defaults = {
		speed : 800,
		optOpacity : false,
		translateFactor : 230,
		maxAngle : 25,
		maxScale : 2,
		autoplay : true,
		keyboard : true,
		interval : 4000,
		onBeforeChange : function( slide, idx ) { return false; },
		onAfterChange : function( slide, idx ) { return false; }
	};

	$.Slitslider.prototype = {

		_init : function( options ) {
			
			this.options = $.extend( true, {}, $.Slitslider.defaults, options );

			this.transEndEventNames = {
				'WebkitTransition' : 'webkitTransitionEnd',
				'MozTransition' : 'transitionend',
				'OTransition' : 'oTransitionEnd',
				'msTransition' : 'MSTransitionEnd',
				'transition' : 'transitionend'
			};
			this.transEndEventName = this.transEndEventNames[ Modernizr.prefixed( 'transition' ) ];
			this.support = Modernizr.csstransitions && Modernizr.csstransforms3d;
			this.$el = this.$elWrapper.children( '.sl-slider' );
			this.$slides = this.$el.children( '.sl-slide' ).hide();
			this.slidesCount = this.$slides.length;
			this.current = 0;
			this.isAnimating = false;
			this._getSize();
			this._layout();
			this._loadEvents();
			if( this.options.autoplay ) {
			
				this._startSlideshow();
			
			}

		},
		_getSize : function() {

			this.size = {
				width : this.$elWrapper.outerWidth( true ),
				height : this.$elWrapper.outerHeight( true )
			};

		},
		_layout : function() {
			
			this.$slideWrapper = $( '<div class="sl-slides-wrapper" />' );
			
			this.$slides.wrapAll( this.$slideWrapper ).each( function( i ) {
				
				var $slide = $( this ),
					orientation = $slide.data( 'orientation' );
					
				$slide.addClass( 'sl-slide-' + orientation )
					  .children()
					  .wrapAll( '<div class="sl-content-wrapper" />' )
					  .wrapAll( '<div class="sl-content" />' );
			
			} );
			
			this._setSize();
			this.$slides.eq( this.current ).show();
			
		},
		_navigate : function( dir, pos ) {
			
			if( this.isAnimating || this.slidesCount < 2 ) {
			
				return false;
			
			}

			this.isAnimating = true;

			var self = this,
				$currentSlide = this.$slides.eq( this.current );

			if( pos !== undefined ) {

				this.current = pos;

			}
			else if( dir === 'next' ) {

				this.current = this.current < this.slidesCount - 1 ? ++this.current : 0;

			}
			else if( dir === 'prev' ) {

				this.current = this.current > 0 ? --this.current : this.slidesCount - 1;

			}

			this.options.onBeforeChange( $currentSlide, this.current );
			
			var $nextSlide = this.$slides.eq( this.current ),
				$movingSlide = ( dir === 'next' ) ? $currentSlide : $nextSlide,
				
				configData = $movingSlide.data(),
				config = {};
			
			config.orientation = configData.orientation || 'horizontal',
			config.slice1angle = configData.slice1Rotation || 0,
			config.slice1scale = configData.slice1Scale || 1,
			config.slice2angle = configData.slice2Rotation || 0,
			config.slice2scale = configData.slice2Scale || 1;
				
			this._validateValues( config );
			
			var cssStyle = config.orientation === 'horizontal' ? {
					marginTop : -this.size.height / 2
				} : {
					marginLeft : -this.size.width / 2
				},
				resetStyle = {
					'transform' : 'translate(0%,0%) rotate(0deg) scale(1)',
					opacity : 1 
				},
				slice1Style	= config.orientation === 'horizontal' ? {
					'transform' : 'translateY(-' + this.options.translateFactor + '%) rotate(' + config.slice1angle + 'deg) scale(' + config.slice1scale + ')'
				} : {
					'transform' : 'translateX(-' + this.options.translateFactor + '%) rotate(' + config.slice1angle + 'deg) scale(' + config.slice1scale + ')'
				},
				slice2Style	= config.orientation === 'horizontal' ? {
					'transform' : 'translateY(' + this.options.translateFactor + '%) rotate(' + config.slice2angle + 'deg) scale(' + config.slice2scale + ')'
				} : {
					'transform' : 'translateX(' + this.options.translateFactor + '%) rotate(' + config.slice2angle + 'deg) scale(' + config.slice2scale + ')'
				};
			
			if( this.options.optOpacity ) {
			
				slice1Style.opacity = 0;
				slice2Style.opacity = 0;
			
			}
			
			$currentSlide.removeClass( 'sl-trans-elems' );

			var transitionProp = {
				'transition' : 'all ' + this.options.speed + 'ms ease-in-out'
			};

			$movingSlide.css( 'z-index', this.slidesCount )
						.find( 'div.sl-content-wrapper' )
						.wrap( $( '<div class="sl-content-slice" />' ).css( transitionProp ) )
						.parent()
						.cond(
							dir === 'prev', 
							function() {
							
								var slice = this;
								this.css( slice1Style );
								setTimeout( function() {
									
									slice.css( resetStyle );

								}, 50 );
										 
							}, 
							function() {
								
								var slice = this;
								setTimeout( function() {
									
									slice.css( slice1Style );

								}, 50 );
						
							}
						)
						.clone()
						.appendTo( $movingSlide )
						.cond(
							dir === 'prev', 
							function() {
								
								var slice = this;
								this.css( slice2Style );
								setTimeout( function() {

									$currentSlide.addClass( 'sl-trans-back-elems' );

									if( self.support ) {

										slice.css( resetStyle ).on( self.transEndEventName, function() {

											self._onEndNavigate( slice, $currentSlide, dir );

										} );

									}
									else {

										self._onEndNavigate( slice, $currentSlide, dir );

									}

								}, 50 );
						
							},
							function() {
								
								var slice = this;
								setTimeout( function() {

									$nextSlide.addClass( 'sl-trans-elems' );
									
									if( self.support ) {

										slice.css( slice2Style ).on( self.transEndEventName, function() {

											self._onEndNavigate( slice, $currentSlide, dir );

										} );

									}
									else {

										self._onEndNavigate( slice, $currentSlide, dir );

									}

								}, 50 );
								
							}
						)
						.find( 'div.sl-content-wrapper' )
						.css( cssStyle );
			
			$nextSlide.show();
			
		},
		_validateValues : function( config ) {
			if( config.slice1angle > this.options.maxAngle || config.slice1angle < -this.options.maxAngle ) {
				
				config.slice1angle = this.options.maxAngle;
			
			}
			if( config.slice2angle > this.options.maxAngle  || config.slice2angle < -this.options.maxAngle ) {
				
				config.slice2angle = this.options.maxAngle;
			
			}
			if( config.slice1scale > this.options.maxScale || config.slice1scale <= 0 ) {
			
				config.slice1scale = this.options.maxScale;
			
			}
			if( config.slice2scale > this.options.maxScale || config.slice2scale <= 0 ) {
				
				config.slice2scale = this.options.maxScale;
			
			}
			if( config.orientation !== 'vertical' && config.orientation !== 'horizontal' ) {
			
				config.orientation = 'horizontal'
			
			}
			
		},
		_onEndNavigate : function( $slice, $oldSlide, dir ) {
			
			var $slide = $slice.parent(),
				removeClasses = 'sl-trans-elems sl-trans-back-elems';
			
			$slice.remove();
			$slide.css( 'z-index', 1 )
				  .find( 'div.sl-content-wrapper' )
				  .unwrap();
			
			$oldSlide.hide().removeClass( removeClasses );
			$slide.removeClass( removeClasses );
			this.isAnimating = false;
			this.options.onAfterChange( $slide, this.current );
			
		},
		_setSize : function() {
		
			var cssStyle = {
				width : this.size.width,
				height : this.size.height
			};
			
			this.$el.css( cssStyle ).find( 'div.sl-content-wrapper' ).css( cssStyle );
		
		},
		_loadEvents : function() {
			
			var self = this;
			
			$window.on( 'debouncedresize.slitslider', function( event ) {
				
				self._getSize();
				self._setSize();
				
			} );

			if ( this.options.keyboard ) {
				
				$document.on( 'keydown.slitslider', function(e) {

					var keyCode = e.keyCode || e.which,
						arrow = {
							left: 37,
							up: 38,
							right: 39,
							down: 40
						};

					switch (keyCode) {
						
						case arrow.left :

							self._stopSlideshow();
							self._navigate( 'prev' );
							break;
						
						case arrow.right :
							
							self._stopSlideshow();
							self._navigate( 'next' );
							break;

					}

				} );

			}
		
		},
		_startSlideshow: function() {

			var self = this;

			this.slideshow = setTimeout( function() {

				self._navigate( 'next' );

				if ( self.options.autoplay ) {

					self._startSlideshow();

				}

			}, this.options.interval );

		},
		_stopSlideshow: function() {

			if ( this.options.autoplay ) {

				clearTimeout( this.slideshow );
				this.isPlaying = false;
				this.options.autoplay = false;

			}

		},
		_destroy : function( callback ) {
			
			this.$el.off( '.slitslider' ).removeData( 'slitslider' );
			$window.off( '.slitslider' );
			$document.off( '.slitslider' );
			this.$slides.each( function( i ) {

				var $slide = $( this ),
					$content = $slide.find( 'div.sl-content' ).children();

				$content.appendTo( $slide );
				$slide.children( 'div.sl-content-wrapper' ).remove();

			} );
			this.$slides.unwrap( this.$slideWrapper ).hide();
			this.$slides.eq( 0 ).show();
			if( callback ) {

				callback.call();

			}

		},
		add : function( $slides, callback ) {

			this.$slides = this.$slides.add( $slides );

			var self = this;
			
			
			$slides.each( function( i ) {

				var $slide = $( this ),
					orientation = $slide.data( 'orientation' );

				$slide.hide().addClass( 'sl-slide-' + orientation )
					  .children()
					  .wrapAll( '<div class="sl-content-wrapper" />' )
					  .wrapAll( '<div class="sl-content" />' )
					  .end()
					  .appendTo( self.$el.find( 'div.sl-slides-wrapper' ) );

			} );

			this._setSize();

			this.slidesCount = this.$slides.length;
			
			if ( callback ) {

				callback.call( $items );

			}

		},
		next : function() {

			this._stopSlideshow();
			this._navigate( 'next' );

		},
		previous : function() {

			this._stopSlideshow();
			this._navigate( 'prev' );

		},
		jump : function( pos ) {

			pos -= 1;

			if( pos === this.current || pos >= this.slidesCount || pos < 0 ) {

				return false;

			}

			this._stopSlideshow();
			this._navigate( pos > this.current ? 'next' : 'prev', pos );

		},
		play : function() {

			if( !this.isPlaying ) {

				this.isPlaying = true;

				this._navigate( 'next' );
				this.options.autoplay = true;
				this._startSlideshow();

			}

		},
		pause : function() {

			if( this.isPlaying ) {

				this._stopSlideshow();

			}

		},
		isActive : function() {

			return this.isAnimating;

		},
		destroy : function( callback ) {

			this._destroy( callback );
		
		}

	};
	
	var logError = function( message ) {

		if ( window.console ) {

			window.console.error( message );
		
		}

	};
	
	$.fn.slitslider = function( options ) {

		var self = $.data( this, 'slitslider' );
		
		if ( typeof options === 'string' ) {
			
			var args = Array.prototype.slice.call( arguments, 1 );
			
			this.each(function() {
			
				if ( !self ) {

					logError( "cannot call methods on slitslider prior to initialization; " +
					"attempted to call method '" + options + "'" );
					return;
				
				}
				
				if ( !$.isFunction( self[options] ) || options.charAt(0) === "_" ) {

					logError( "no such method '" + options + "' for slitslider self" );
					return;
				
				}
				
				self[ options ].apply( self, args );
			
			});
		
		} 
		else {
		
			this.each(function() {
				
				if ( self ) {

					self._init();
				
				}
				else {

					self = $.data( this, 'slitslider', new $.Slitslider( options, this ) );
				
				}

			});
		
		}
		
		return self;
		
	};
	
} )( jQuery, window );
