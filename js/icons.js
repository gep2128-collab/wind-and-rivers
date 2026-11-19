// Small vector icons for the comparison (story page card and the at-stake labels on the map).
// Each icon is one SVG path on a 24×24 grid, filled with the "evenodd" rule, so the same string works
// in inline SVG and in a canvas Path2D.
(function(){
  const dot=(x,y,r)=>`M${x-r} ${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`;
  window.ICONS={
    // mammals: a paw print
    mammal:dot(5,10,2.1)+dot(9.2,5.6,2.2)+dot(14.8,5.6,2.2)+dot(19,10,2.1)+'M12 11.6c-3.2 0-6.2 3.6-6.2 6.2 0 2.2 2.1 3 3.6 2.6 1.1-.3 1.7-.8 2.6-.8s1.5.5 2.6.8c1.5.4 3.6-.4 3.6-2.6 0-2.6-3-6.2-6.2-6.2Z',
    // amphibians: a frog seen from the front (eyes with pupils)
    amphibian:dot(7.5,7.2,3)+dot(7.5,7.2,1.2)+dot(16.5,7.2,3)+dot(16.5,7.2,1.2)+'M3 15.5c0-3.4 3.6-5.3 9-5.3s9 1.9 9 5.3c0 3.3-3.8 5.3-9 5.3s-9-2-9-5.3Z'+'M7.6 15.4c2.9 1.8 5.9 1.8 8.8 0-2.9 3-5.9 3-8.8 0Z', // body with a smile
    // fire hotspots: a flame
    flame:'M12.6 2c.6 3.4 5.9 6 5.9 12a6.5 6.5 0 0 1-13 0c0-3.2 1.7-5.4 3.2-7 .1 2 .9 3.3 2.2 3.8-.4-3.2.1-6.1 1.7-8.8Z',
    // CO₂ released: a cloud of smoke
    cloud:'M7 19.5a4.5 4.5 0 0 1-.9-8.9 6 6 0 0 1 11.6-1.2A5 5 0 0 1 17.6 19.5H7Z',
    // plants: a leaf
    leaf:'M20.5 3.5C9 3.5 3.5 8.8 3.5 15.4c0 1.4.3 2.6.8 3.6L2.8 20.5l1.1 1.1 1.6-1.6c1 .5 2.2.8 3.5.8 6.8 0 11.5-5.7 11.5-17.3ZM6.4 18.7c2.7-4.6 5.9-7.5 10.1-9.6-3.6 2.6-6.4 5.8-8.6 10.4l-1.5-.8Z'
    ,
    // air temperature: a thermometer
    thermo:'M9.8 4.6a2.2 2.2 0 0 1 4.4 0v9.2a5 5 0 1 1-4.4 0Z'+dot(12,17.8,1.8)+'M11.3 7h1.4v8.4h-1.4Z',
    // birds: a small perched bird
    bird:'M3 13.2c3-.4 5-2.6 6.4-5.1C10.6 6 12.4 5 14.4 5c1.6 0 2.9.8 3.6 2l3 .8-2.6 1.4c.2 4.6-3.4 8.8-9 8.8H6.2l2.3-2.2C6 15.7 4 15 3 13.2Z'+dot(16.4,7.4,.9),
    // animals in general (most records are insects): a beetle
    bug:dot(12,4.6,2)+'M12 7.2c3.3 0 5.5 3 5.5 6.9S15 21 12 21s-5.5-3-5.5-6.9S8.7 7.2 12 7.2Z'+'M11.5 8.6h1v11.2h-1Z'+'M3.5 9.8h2.8v1.2h-2.8Z'+'M17.7 9.8h2.8v1.2h-2.8Z'+'M3.5 13.4h2.8v1.2h-2.8Z'+'M17.7 13.4h2.8v1.2h-2.8Z'+'M3.5 17h2.8v1.2h-2.8Z'+'M17.7 17h2.8v1.2h-2.8Z' // body, wing line and six legs
  };
  // inline SVG for HTML: icon name, size in px, colour
  window.iconSvg=(n,s=16,c='currentColor')=>`<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}" fill="${c}" fill-rule="evenodd"/></svg>`;
})();
