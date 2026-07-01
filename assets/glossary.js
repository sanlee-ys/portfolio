(function () {
  var input = document.getElementById("glossary-filter");
  var empty = document.getElementById("glossary-empty");
  if (!input) return;
  var terms = Array.prototype.slice.call(document.querySelectorAll(".glossary-list .decision"));

  input.addEventListener("input", function () {
    var q = input.value.trim().toLowerCase();
    var visible = 0;
    terms.forEach(function (el) {
      var haystack = (el.dataset.term || "") + " " + el.textContent.toLowerCase();
      var match = !q || haystack.toLowerCase().indexOf(q) !== -1;
      el.hidden = !match;
      if (match) visible++;
    });
    if (empty) empty.hidden = visible !== 0;
  });
})();
