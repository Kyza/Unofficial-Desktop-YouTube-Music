$("html, body").animate({
  scrollTop: $("#page1").offset().top
}, 100);

$("#previewImage").tilt({});

$("#topIndicator").hide();
$("#topIndicator").css("opacity", "0");
$("#topIndicator").css("pointer-events", "none");
$("#topIndicator").show();

var startTime = performance.now();

var pageNum = 1;

var lastPage = 3;

$("body").bind("mousewheel", function(e) {
  var endTime = performance.now();

  if (endTime - startTime > 5e2) {
    startTime = performance.now();

    scroll(e.originalEvent.wheelDelta / 120 > 0);
  }
});

$("#topIndicator").click(() => {
  scroll(true);
});

$("#bottomIndicator").click(() => {
  scroll(false);
});

function scroll(up) {
  if (up) {
    if (pageNum - 1 <= 0) return;

    pageNum--;
  } else {
    if (pageNum >= lastPage) return;

    pageNum++;
  }

  $("#topIndicator").show();
  $("#bottomIndicator").show();
  if (pageNum == 1) {
    $("#topIndicator").css("opacity", "0");
    $("#topIndicator").css("pointer-events", "none");

    $("#bottomIndicator").css("opacity", "1");
    $("#bottomIndicator").css("pointer-events", "auto");
  } else if (pageNum == lastPage) {
    $("#topIndicator").css("opacity", "1");
    $("#topIndicator").css("pointer-events", "auto");

    $("#bottomIndicator").css("opacity", "0");
    $("#bottomIndicator").css("pointer-events", "none");
  } else {
    $("#topIndicator").css("opacity", "1");
    $("#topIndicator").css("pointer-events", "auto");

    $("#bottomIndicator").css("opacity", "1");
    $("#bottomIndicator").css("pointer-events", "auto");
  }

  $("html, body").animate({
    scrollTop: $("#page" + pageNum).offset().top
  }, 100);
}

tippy("#listen", {
  content: `<input type="button" id="windows" value="Windows" /><input type="button" id="linux" value="Linux" />`,
  interactive: true,
  placement: "bottom",
  theme: "translucent"
});
