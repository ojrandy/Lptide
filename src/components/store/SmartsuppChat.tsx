import Script from "next/script";

// Smartsupp live chat (client's account). The key is public: it ships in every page that loads the widget.
const SMARTSUPP_KEY = "4708b9e8f232e8d88809ce7dca422ca8432c8798";

/**
 * Storefront only. Loads after the page is idle so it doesn't compete with the catalog.
 * Bubble sits bottom-left: bottom-right is the first-party SupportWidget. On phones it clears the
 * product pages' purchase bar, like .lp-support does (store-extra.css).
 */
export function SmartsuppChat() {
  return (
    <>
      <Script id="smartsupp" strategy="lazyOnload">
        {`var _smartsupp = window._smartsupp || {};
_smartsupp.key = '${SMARTSUPP_KEY}';
_smartsupp.alignX = 'left';
_smartsupp.offsetY = window.matchMedia('(max-width: 760px)').matches ? 84 : 16;
window._smartsupp = _smartsupp;
window.smartsupp||(function(d) {
  var s,c,o=window.smartsupp=function(){ o._.push(arguments)};o._=[];
  s=d.getElementsByTagName('script')[0];c=d.createElement('script');
  c.type='text/javascript';c.charset='utf-8';c.async=true;
  c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
})(document);`}
      </Script>
      <noscript>
        Powered by{" "}
        <a href="https://www.smartsupp.com" target="_blank" rel="noopener noreferrer">
          Smartsupp
        </a>
      </noscript>
    </>
  );
}
