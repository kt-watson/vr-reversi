window.addEventListener('load', init);

const boardMap = {
    x:[-8.7,-6.2,-3.9,-1.2,1.2,3.9,6.2,8.7],
    z:[-8.7,-6.2,-3.9,-1.2,1.2,3.9,6.2,8.7],
}

const turnInfo = {
    "1":"黒",
    "-1":"白"
}

// シーンを取得
const scene = document.querySelector('a-scene').object3D;

let randomplayer = false;

let board = [
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,-1,1,0,0,0],
    [0,0,0,1,-1,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
]

let history = [];

let turn = 1;
let reverseKomas = [];
let counter = 1;
let gameFinished = false;

function init() {

    console.log("init start")
    AFRAME.registerComponent('koma-listener', {
        init: function () {
          this.el.addEventListener('click', function (evt) {
            let komaId = evt.detail.intersection.object.el.id
            console.log('koma clicked at',komaId);
            document.getElementById(komaId).object3D.visible = true;
          });
        }
      });


    for(let row = 0; row < 8; row++){
        for(let col = 0; col < 8; col++){
            //aframeの要素として一度追加
            var koma = document.getElementById("koma" + row + col).object3D;
            koma.scale.set(0.3, 0.3, 0.3);
            koma.position.set(boardMap.x[col], 0.7,boardMap.z[row]);
            if(board[row][col] === 0){
                koma.visible = false;
            }
            if(board[row][col] === -1){
                koma.rotation.set(0, 0, Math.PI);
            }
        }
    }

    // 平行光源
    const light = new THREE.DirectionalLight(0xFFFFFF);
    light.intensity = 1; // 光の強さを倍に
    light.position.set(0, 1, 0);
    // シーンに追加
    scene.add(light);


    // Component to change to a sequential color on click.
    AFRAME.registerComponent('cursor-listener', {
    init: function () {
      var lastIndex = -1;
      var COLORS = ['red', 'green', 'blue'];
      this.el.addEventListener('click', function (evt) {
        lastIndex = (lastIndex + 1) % COLORS.length;
        this.setAttribute('material', 'color', COLORS[lastIndex]);
        console.log('I was clicked at: ', evt.detail.intersection.point);
      });
    }
  });

}

async function tick() {

    //駒をひっくり返すアニメーション
    if (reverseKomas.length > 0){
        for (const k of reverseKomas){
            scene.getObjectByName(k).rotation.z += Math.PI / 30;
            }
            if (counter === 30){
                for(let row = 0; row < 8; row++){
                    for(let col = 0; col < 8; col++){
                        let koma = scene.getObjectByName("koma" + row + col);
                        if(board[row][col] === 1){
                            koma.rotation.set(0, 0, 0);
                        }
                        if(board[row][col] === -1){
                            koma.rotation.set(0, 0, Math.PI);
                        }
                    }
                }
            reverseKomas = [];
            counter = 1;
            //戦況判断
            if(countStone(1) + countStone(-1) === 64) gameFinished = true;
            if(countStone(1) === 0 || countStone(-1) === 0) gameFinished = true;

            //ランダムと対戦の場合は次の駒をランダムに置く
            if(randomplayer && turn === -1){
                let next_steps = await searchValidKoma(-1);
                if (next_steps.length > 0){
                let utite =  next_steps[Math.floor(Math.random() * next_steps.length)];
                console.log(utite);
                reverseKomas = await searchReverseKoma(Number(utite[4]),Number(utite[5]),turn,board);
                if (reverseKomas.length === 0){
                    //alert("そこには打てません");
                    event.preventDefault();
                }else{
                    if(turn === -1){
                        scene.getObjectByName(utite).rotation.set(0, 0, Math.PI);
                    }
                    scene.getObjectByName(utite).visible = true;
                    updateHistory(Number(utite[4]),Number(utite[5]),turn,board);
                    board[Number(utite[4])][Number(utite[5])] = turn;
                    for(let k of reverseKomas) board[Number(k[4])][Number(k[5])] = turn;
                    turn = -1 * turn;
                }
              }
            }
        }counter += 1
        }

}
//document.addEventListener( 'mousedown', clickPosition, false );

// document.addEventListener('touchstart', function(event) {
//     // touchstar以降のイベントを発生させないように
//     event.preventDefault();
//     clickPosition(event);  
//   },{ passive: false });

async function clickPosition( event) {
    const element = event.currentTarget.activeElement;
    // canvas要素上のXY座標
    if(event.type === 'mousedown'){
        x = event.clientX - element.offsetLeft;
        y = event.clientY - element.offsetTop;            
    }else{
        x = event.changedTouches[0].pageX - element.offsetLeft;
        y = event.changedTouches[0].pageY - element.offsetTop; 
    }

    // canvas要素の幅・高さ
    const w = element.offsetWidth;
    const h = element.offsetHeight;
     
    // マウスクリック位置を正規化
    var mouse = new THREE.Vector2();
    mouse.x = ( x / w ) * 2 - 1;
    mouse.y = -( y / h ) * 2 + 1;
     
    // Raycasterインスタンス作成
    var raycaster = new THREE.Raycaster();
    // 取得したX、Y座標でrayの位置を更新
    raycaster.setFromCamera( mouse, camera );
    // オブジェクトの取得
    var intersects = raycaster.intersectObjects( scene.getObjectByName("komagroup").children,true);
    //var intersects = raycaster.intersectObjects( scene.children,true);
    
    if(intersects.length > 0){
        let koma = intersects[0].object.parent.name;
        reverseKomas = await searchReverseKoma(Number(koma[4]),Number(koma[5]),turn,board);
        if (reverseKomas.length === 0){
            //alert("そこには打てません");
            event.preventDefault();
        }else{
            if(turn === -1){
                scene.getObjectByName(intersects[0].object.parent.name).rotation.set(0, 0, Math.PI);
            }
            scene.getObjectByName(intersects[0].object.parent.name).visible = true;
            updateHistory(Number(koma[4]),Number(koma[5]),turn,board);
            board[Number(koma[4])][Number(koma[5])] = turn;
            for(let k of reverseKomas) board[Number(k[4])][Number(k[5])] = turn;
            turn = -1 * turn;
        }
    }
}


function searchReverseKoma(row,col,turn,board){

    return new Promise((resolve, reject) => {

    let search_direction = [];
    let reverse_komas = [];

    //すでに駒が置いてある場合は探索しない
    if(board[row][col] != 0) return resolve(reverse_komas);;

    for (let r of [-1,0,1]){
        for (let c of [-1,0,1]){
            try {
                let new_row = row + r;
                let new_col = col + c;

                if (new_row < 0 || new_col < 0) continue;
                if (board[new_row][new_col] === turn || board[new_row][new_col] === 0) continue;

                search_direction.push([r,c])

            }catch(error){
                continue;
            }
        }
    }
    for (let rc of search_direction){
        let reverse_koma = [];
        let r = rc[0];
        let c = rc[1];
        let new_row = row;
        let new_col = col;
        while(true){
            new_row += r;
            new_col += c;
            if ((new_row < 0 || new_row > 7) || (new_col < 0 || new_col > 7)) break;
            if (board[new_row][new_col] === -1 * turn){
                reverse_koma.push("koma" + new_row + new_col);
            }else if(board[new_row][new_col] === turn){
                reverse_komas.push(...reverse_koma);
                break;
            }else break;
                
        }    
    }
    return resolve(reverse_komas);
});
}

async function searchValidKoma(turn){
    let reversableKomas = [];
    for(let row = 0; row < 8; row++){
        for(let col = 0; col < 8; col++){
            let result = await searchReverseKoma(row,col,turn,board);
            if (result.length > 0) reversableKomas.push("koma" + row + col);
        }
    }
    return reversableKomas;
}



function draw() {
    var canvas = document.getElementById('canvas2d');

    if ( ! canvas || ! canvas.getContext ) {
      return false;
    }
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'normal 20pt "メイリオ"';
    context.fillStyle = "white";
    context.fillText('現在のターン：' + turnInfo[String(turn)], 15, 35);
    context.fillText('黒の数：' + countStone(1), 15, 65);
    context.fillText('白の数：' + countStone(-1), 15, 95);

    if (gameFinished){

        canvas.width =  document.getElementById('canvas').width;
        canvas.height =  document.getElementById('canvas').height;

        let blackstoneCount = countStone(1);
        let whitestoneCount = countStone(-1);
        let text = ""
        if(blackstoneCount === whitestoneCount) text = '引き分け';
        else if(blackstoneCount > whitestoneCount) text = '勝者：' + turnInfo[String(1)];
        else text = '勝者：' + turnInfo[String(-1)];

        let fontSize = 100;
        context.font = 'normal ' +  fontSize + 'pt "メイリオ"';
        context.textAlign = 'center';
        context.fillStyle = "red";
        context.fillText( text, canvas.width / 2, canvas.height / 2 ) ;
        context.font = 'normal ' +  50 + 'pt "メイリオ"';
        context.fillText('黒の数：' + countStone(1), canvas.width / 2, canvas.height / 2 + 70 );
        context.fillText('白の数：' + countStone(-1), canvas.width / 2, canvas.height / 2  + 140);
    }
}

function countStone(turn){
    const reducer = (accumulator, currentValue) => accumulator + currentValue;
    return board.map(x => x.filter(function(k){return k === turn}).length).reduce(reducer);
}

