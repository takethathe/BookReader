function book_source(site) {
  this.name = site.name;
  this.css = site.css;
  this.js = site.js;
  this.url = site.url;
  this.run = function(){
    this.download_page(this.url, function(data){
      $('#result').html(data);
    });
  }
}

book_source.prototype.download_page = function(url, success) {
  $.get(url, function(data){
    success(data);
  });
}

$(document).ready(function(){
  var book = new book_source({
    'name': 'zwwx',
    'css': 'zwwx.css',
    'js': 'zwwx.js',
    'url': 'http://www.baidu.com',
  });
  book.run();
});