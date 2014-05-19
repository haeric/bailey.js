
var navBar = document.getElementById('nav-ul');
var __a1 = document.getElementsByTagName('h2');
var __l1 = __a1.length;
for (var __i1 = 0; __i1 < __l1; __i1++) {
    var element = __a1[__i1];
    navBar.innerHTML += '<li id="' + element.id + '-btn"><a href="#' + element.id + '">' + element.innerHTML + '</a></li>';
}

$('body').scrollspy({
    'target': '.navbar'
});
