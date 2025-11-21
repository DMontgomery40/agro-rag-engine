// Layout guard: ensures the sidepanel is a sibling of .content under .layout
// Some merges left the sidepanel nested inside .content in certain snapshots.
// This script corrects the DOM at runtime without changing styles.
(function(){
  'use strict';
  function fixSidepanelPlacement(){
    try{
      var layout = document.querySelector('.layout');
      if (!layout) return;
      var content = layout.querySelector(':scope > .content') || document.querySelector('.content');
      var sidepanel = document.querySelector('.sidepanel');
      if (!content || !sidepanel) return;

      // If sidepanel is not a direct child of layout, move it after content
      if (sidepanel.parentElement !== layout){
        layout.appendChild(sidepanel);
      }
      // Ensure correct ordering: content first, sidepanel second
      if (content.nextElementSibling !== sidepanel){
        layout.insertBefore(sidepanel, content.nextElementSibling);
      }
      // Ensure resize handle (if any) stays before content
      var handle = layout.querySelector(':scope > .resize-handle');
      if (handle && handle.nextElementSibling !== content){
        layout.insertBefore(content, handle.nextElementSibling);
      }
    }catch(e){ /* best effort */ }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fixSidepanelPlacement);
  } else {
    fixSidepanelPlacement();
  }
})();

