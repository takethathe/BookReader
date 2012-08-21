function book_source() {
    this.book = '';
    this.books = {};
    this.show = function(url, title) {
        this.download_page(url, function(data){
            var data_ = $(data);
            var text = $('#content', data_).text();
            $('#result').html(title+'<br>');
            $('#result').html(text+'<br>');
            $('div.divimage img', data_).each(function(i, item){
                var src = $(item).attr('src');
                $('#result').append('<img src="'+src+'">');
            });
        });
    };
    this.run = function(){
        var book_info = this.books[this.book];
        if (book_info) {
            this.download_page(book_info.url, function(data){
                var data_ = $(data);
                $('dd a', data_).each(function(i, item){
                    var link = 'http://www.zwwx.com/book/3/3730/'+$(item).attr('href');
                    var title = $(item).text();
                    $('#result').append('<dd><a href="javascript:book.show(\''+link+'\',\''+title+'\');">'+title+'</a></dd>');
                });
            });
        } else {
            alert('Can not find '+this.book);
        }
    };
    this.init = function() {
        this.fs = require('fs');
        var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
        this.books_json = home+'/Documents/books/books.json';
        this.books_root = home+'/Documents/books';
        if (!this.fs.existsSync(this.books_json)) {
            if (!this.fs.existsSync(this.books_root)) {
                this.fs.mkdirSync(this.books_root);
            }
            this.fs.writeFileSync(this.books_json, '{}');
        }
        var json = this.fs.readFileSync(this.books_json);
        this.books = eval('('+json+')');
    };

    this.addBook = function(book_info) {
        this.books[book_info['name']] = book_info;
        this.flushBookList();
    };

    this.chooseBook = function(name) {
        this.book = name;
    };

    this.flushBookList = function() {
        var book_json = JSON.stringify(this.books);
        if (!this.fs.existsSync(this.books_root)) {
            this.fs.mkdirSync(this.books_root);
        }
        this.fs.writeFile(this.books_json, book_json, function(err){
            if (err) {
                alert(err);
                throw err;
            }
        });
    };
}

book_source.prototype.download_page = function(url, success) {
    $.get(url, function(data){
        success(data);
    });
};

$(document).ready(function(){
    window.book = new book_source();
    window.book.init();
    window.book.addBook({
        'name': 'zwwx',
        'css': 'zwwx.css',
        'js': 'zwwx.js',
        'url': 'http://www.zwwx.com/book/3/3730/index.html'
    });
    window.book.chooseBook('zwwx');
    window.book.run();
});
