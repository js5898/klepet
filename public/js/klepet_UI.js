function divElementEnostavniTekst(sporocilo) {

  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;   //boolean
  var jeSlika = sporocilo.indexOf('<img class=\'slike\' src=') > -1;
  var jeVideo = sporocilo.indexOf('<iframe src="https://www.youtube.com/embed/') > -1;
  
  if (jeSmesko || jeSlika || jeVideo) {
    console.log("Pride sem");
    sporocilo = sporocilo.replace(/\</g, '&lt;');
    sporocilo = sporocilo.replace(/\>/g, '&gt;');
   
    //sporocilo = sporocilo.replace(/\>/g, '&gt;');
    
    //if(jeSlika)  sporocilo = sporocilo.replace(/&lt;img class='slike' src=/g, "<$1");
    sporocilo = sporocilo.replace(/&lt;((img src='http:\/\/sandbox\.lavbic\.net\/teaching\/OIS\/gradivo\/)|(img class='slike' src=))/g, "<$1");
    sporocilo = sporocilo.replace(/(\.jpg|\.png|\.gif)' \/&gt;/g, "$1'> </img>");
    sporocilo = sporocilo.replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />').replace(/&lt;(iframe src='https:\/\/www\.youtube\.com\/embed\/\\S*' allowfullscreen)&gt;&lt;(\/iframe)&gt;/g, "<$1><$2>");
    

    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    //console.log("jeSmesko||jeSlika else");
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;
  isciSlike(sporocilo);

  najdiVideo(sporocilo);

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    //isciSlike(sporocilo);
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}


function isciSlike(vhod) {
  var slika = vhod.toString().match(new RegExp('\\bhttps?:\/\/(?!sandbox.lavbic.net\/teaching\/OIS\/gradivo\/)\\S*\.(png|jpg|gif)\\b', 'gi'));
  //var slika = vhod.toString().match(new RegExp('\\bhttps?:\/\/(?!sandbox.lavbic.net/teaching/OIS/gradivo/)\?!\s*\.(png|jpg|gif)\\b', 'gi'));
  for(var i in slika) {
    console.log("isciSlike - Slika i="+i);
    $('#sporocila').append(divElementHtmlTekst('<img class=\'slike\' src=\"'+ slika[i] + '\">'));
  }
}



function najdiVideo(vhod){
  
  //ce ne najde je null!
  var video = vhod.toString().match(new RegExp('\\bhttps:\/\/www\.youtube\.com\/watch\\?v\\=\\S*', 'gi'));
  console.log("Video: "+video);
    
  if(video){
    for(var i in video){
        $('#sporocila').append(divElementHtmlTekst('<iframe src="https://www.youtube.com/embed/'+video[i].replace(/https\:\/\/www\.youtube\.com\/watch\?v\=/gi, '')+'" allowfullscreen></iframe>'));
    }
  }
}


$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });
  

  $('#vsebina').jrumble();
  var stopID;
  
  socket.on('dregljaj', function(rezultat) {
      var dregljajT = rezultat.dregljaj;
      
     
      console.log("Dregljaj T/F: "+dregljajT);
      
      if(dregljajT){
        //console.log("Vzdevek: "+rezultat.vzdevek);
        
        clearTimeout(stopID);
        $('#vsebina').trigger('startRumble');
        
        stopID=setTimeout(function (){
          $('#vsebina').trigger('stopRumble'); }, 1500);
        }
  })

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    
    $('#sporocila').append(novElement);

    //SPREMEMBE 2
    isciSlike(sporocilo.besedilo);

    najdiVideo(sporocilo.besedilo);

  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });


//Seznam userjev - izpis tabele userjev
  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    //Izpis možnosti zasebno
    $("#seznam-uporabnikov div").click(function() {
        var posljiZasebno = $("#poslji-sporocilo");
        //console.log("test");
        posljiZasebno.val("/zasebno \"" + $(this).text() + "\" ");
        $('#poslji-sporocilo').focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}