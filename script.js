var devices = {};
var socketIds = {};
var ul = $('#deviceList');
var temp;
var screenWidth = 371, screenHeight = 710;
var client = new Tcp();

function closeSocket(screenWin) {
  for (id in screenWin.contentWindow.socketIds) {
    console.log('close socket:', screenWin.contentWindow.socketIds[id]);
    chrome.sockets.tcp.close(screenWin.contentWindow.socketIds[id], function () {
      if (chrome.runtime.lastError) console.log(chrome.runtime.lastError);

    })
  }
  screenWin.socketIds = {};
}


function createDeviceLi(device, fragment) {
  var li = document.createElement('li');
  var liContnt = '<span>' + device.productName + '</span>' + '<span>' + device.serialNumber + '</span>';
  $(li).attr('id', device.device + device.serialNumber);
  var btn = document.createElement('button');
  btn.innerHTML = 'view';
  $(btn).addClass('btn-warning');
  li.innerHTML = liContnt;
  li.appendChild(btn);
  fragment.appendChild(li);
  setTimeout(function(){
    //?????3???????socket
    sendCommands('client', "shell:wm size", device.serialNumber, ()=> {
      //??????socketIds????????socketId
      socketIds[client.socketId] = device.device + device.serialNumber;
    });
  },3000)
  /*
  * 刚插入手机的时候还需要检测是否有文件，如果没有则安装
  * 安装前需要获取手机的框架，还有sdk版本，再然后推两个文件
  * */

  $(btn).click(function (e) {
    if (!device.SCsize) {
      console.log('想1080x1920')
      device.SCsize = '1080x1920';
    }
    sendCommands('client', "shell:LD_LIBRARY_PATH=/data/local/tmp /data/local/tmp/minicap -P " + device.SCsize + "@360x768/0", device.serialNumber, ()=> {
      //??????socketIds????????socketId
      socketIds[client.socketId] = device.device + device.serialNumber;
    });

    setTimeout(function () {
      sendCommands('client', "shell:/data/local/tmp/minitouch", device.serialNumber, ()=> {
        socketIds[client.socketId] = device.device + device.serialNumber;
      });
    }, 800)

    setTimeout(function(){
      var obj = {
        device : device.device,
        serialNumber : device.serialNumber
      };
      chrome.app.window.create('screen.html', {
        id: JSON.stringify(obj),
        width: screenWidth,
        height: screenHeight,
        maxWidth: screenWidth,
        maxHeight: screenHeight,
        minWidth: screenWidth,
        minHeight: screenHeight,

      }, function (screenWin) {
        screenWin.onClosed.addListener(callback = function () {
          closeSocket(screenWin);
          screenWin.onClosed.removeListener(callback);

        })

      });
    },3000)



    $(e).parents('li').css('backgroundColor', '#ccc').siblings('li').css('backgroundColor', 'none');

  })
}

chrome.sockets.tcp.onReceive.addListener(function (msg) {
  if (socketIds[msg.socketId]) {
    ab2str(msg.data, function (e) {
      if (e.startsWith('OKAY')) {
        return null;
      } else if (e.indexOf('Physical size:') != -1) {
        var reg = /([0-9]+)x([0-9]+)/g;
        var tmp = reg.exec(e);
        devices[socketIds[msg.socketId]]['SCsize'] = tmp[0];
      } else if (e.indexOf('Publishing virtual display') != -1) {
        sendCommands('host', "host-serial:" + devices[socketIds[msg.socketId]].serialNumber + ":forward:tcp:" + devices[socketIds[msg.socketId]].capPort + ";localabstract:minicap", devices[socketIds[msg.socketId]].serialNumber, ()=> {
        });
      } else if (e.indexOf('hard-limiting maximum') != -1) {
        sendCommands('host', "host-serial:" + devices[socketIds[msg.socketId]].serialNumber + ":forward:tcp:" + devices[socketIds[msg.socketId]].touchPort + ";localabstract:minitouch", devices[socketIds[msg.socketId]].serialNumber, ()=> {
        });
      }


    });
  }
})

function appendLi(devicesArr) {
  var fragment = document.createDocumentFragment();
  devicesArr.forEach((item)=> {
    if (!devices[item.device + item.serialNumber]) {
      devices[item.device + item.serialNumber] = item;
      devices[item.device + item.serialNumber]['capPort'] = 3131 + item.device;
      devices[item.device + item.serialNumber]['touchPort'] = 1111 + item.device
      createDeviceLi(devices[item.device + item.serialNumber], fragment);
    } else {
      $('#' + item.device + item.serialNumber).css('background-color', '#ccc')
    }
  });
  ul.append(fragment);

}


$('#mat_findDevice').click(() => {
  chrome.usb.getUserSelectedDevices({
    'multiple': true,
    filters: [{interfaceClass: 255, interfaceSubclass: 66, interfaceProtocol: 1}]
  }, function (devicesArr) {
    appendLi(devicesArr)
  });
});


chrome.usb.getDevices({}, (devicesArr)=> {
  if (chrome.runtime.lastError != undefined) {
    console.warn('chrome.usb.getDevices error: ' +
      chrome.runtime.lastError.message);
    return;
  }
  temp = devicesArr;
  if (devicesArr.length != 0) {
    appendLi(devicesArr)
  }
});

if (chrome.usb.onDeviceAdded) {
  chrome.usb.onDeviceAdded.addListener(function (device) {
    var arr = [];
    arr.push(device);
    appendLi(arr);
    devices[device.device + device.serialNumber] = device;
  });
}

if (chrome.usb.onDeviceRemoved) {
  chrome.usb.onDeviceRemoved.addListener(function (device) {
    delete devices[device.device + device.serialNumber];
    var lis = ul.find('li');
    lis.remove('#' + device.device + device.serialNumber);
  });
}


$('#mat_chooseFile').click(function () {
  chrome.fileSystem.chooseEntry({type: 'openFile'}, function (fileEntry) {
    fileEntry.file(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        var text = this.result;
        console.log(text);
        //do something with text
      }
      reader.readAsText(File);
    });
  });
})
