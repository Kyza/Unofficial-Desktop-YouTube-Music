$("html, body").animate({
  scrollTop: $("#page1").offset().top
}, 100);

$("#previewImage").tilt({});

$("#topIndicator").hide();

var startTime = performance.now();

var pageNum = 1;

var lastPage = 3;

$("html").bind("mousewheel", function(e) {
  var endTime = performance.now();

  if (endTime - startTime > 5e2) {
    startTime = performance.now();

    if (e.originalEvent.wheelDelta / 120 > 0) {
      if (pageNum - 1 <= 0) return;

      pageNum--;
    } else {
      if (pageNum >= lastPage) return;

      pageNum++;
    }

    if (pageNum == 1) {
      $("#topIndicator").hide(400);
      $("#bottomIndicator").show(400);
    } else if (pageNum == lastPage) {
      $("#topIndicator").show(400);
      $("#bottomIndicator").hide(400);
    } else {
      $("#topIndicator").show(400);
      $("#bottomIndicator").show(400);
    }

    $("html, body").animate({
      scrollTop: $("#page" + pageNum).offset().top
    }, 100);
  }
});
