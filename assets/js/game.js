window.onload = function() {

    var ROWS = 5, COLS = 6;
    var TILE_SIZE = 32; //Just support square tiles for now

    var game = new Phaser.Game( 800, 600, Phaser.AUTO, '', { preload: preload, create: create });

    var level1 = [
        24,  7,  5, 37, 17, 13,
        39,  1,  5,  5,  7, 13,
        17,  7,  0,  7,  5, 15,
         1, 13, 37,  5,  5, 39,
         3,  5, 17,  7, 39, 47
    ];

    var level2 = [
         1,  5,  1, 24,
        23,  5,  5,  5,
         3,  0, 13, 13,
         3,  1,  1, 13
    ];

    var level3 = [
        12, 5, 5, 1,
        3,  5, 1, 5,
        3,  1, 5, 5,
        1,  5, 1, 11
    ];

    var level4 = [
        24,  1,  5, 37, 17, 13,
        39,  1,  5,  5, 13, 13,
        17, 37,  0, 37,  5, 15,
         1, 13, 37,  5,  5, 39,
         3,  5, 17,  5, 39, 47
    ];

    var source = 0;
    var sink = 29;
    var hole = 14;

    var map, layer1, marker;

    function preload () {

        game.load.image('smashflow_tileset', 'assets/img/smashflow_tileset.png');

    }

    function create () {

        map = game.add.tilemap();
        map.addTilesetImage('smashflow_tileset');

        game.input.addMoveCallback(updateMarker, this);
        game.input.onDown.add(tileClick, this);
        cursors = game.input.keyboard.createCursorKeys();

        layer1 = map.create('level1', COLS, ROWS, TILE_SIZE, TILE_SIZE);
        for (var i=0; i<COLS; ++i) {
            for (var j=0; j<ROWS; ++j) {
                currentTile = level1[j*COLS + i];
                if (currentTile != 0) {
                    map.putTile(currentTile - 1, i, j);
                }
            }
        }
        layer1.resizeWorld();
        fillTiles();
        game.input.keyboard.onDownCallback = update;

        createTileSelector();
    }

    function update() {

        if (cursors.left.downDuration(100) && hole % COLS != COLS - 1) {
            tiles = layer1.getTiles(0, 0, TILE_SIZE * COLS, TILE_SIZE * ROWS);
            for (var i=0; i<tiles.length; ++i) {
                if (Math.floor(i/COLS) == Math.floor(hole/COLS) && i > hole) {
                    if (source == i || sink == i) break;
                    map.putTile(tiles[i].index, hole % COLS, Math.floor(hole/COLS));
                    map.removeTile(i%COLS, Math.floor(i/COLS));
                    hole = i;
                    game.time.removeAll();
                    fillTiles();
                    break;
                }
            }
        }
        if (cursors.right.downDuration(100) && hole % COLS != 0) {
            tiles = layer1.getTiles(0, 0, TILE_SIZE * COLS, TILE_SIZE * ROWS);
            for (var i=tiles.length-1; i>=0; --i) {
                if (Math.floor(i/COLS) == Math.floor(hole/COLS) && i < hole) {
                    if (source == i || sink == i) break;
                    map.putTile(tiles[i].index, hole % COLS, Math.floor(hole/COLS));
                    map.removeTile(i%COLS, Math.floor(i/COLS));
                    hole = i;
                    game.time.removeAll();
                    fillTiles();
                    break;
                }
            }
        }
        if (cursors.up.downDuration(100) && Math.floor(hole/COLS) != ROWS - 1) {
            tiles = layer1.getTiles(0, 0, TILE_SIZE * COLS, TILE_SIZE * ROWS);
            for (var i=0; i<tiles.length; ++i) {
                if (i%COLS == hole%COLS && i > hole) {
                    if (source == i || sink == i) break;
                    map.putTile(tiles[i].index, hole % COLS, Math.floor(hole/COLS));
                    map.removeTile(i%COLS, Math.floor(i/COLS));
                    hole = i;
                    game.time.removeAll();
                    fillTiles();
                    break;
                }
            }
        }
        if (cursors.down.downDuration(100) && Math.floor(hole/COLS) != 0) {
            tiles = layer1.getTiles(0, 0, TILE_SIZE * COLS, TILE_SIZE * ROWS);
            for (var i=tiles.length-1; i>=0; --i) {
                if (i%COLS == hole%COLS && i < hole) {
                    if (source == i || sink == i) break;
                    map.putTile(tiles[i].index, hole % COLS, Math.floor(hole/COLS));
                    map.removeTile(i%COLS, Math.floor(i/COLS));
                    hole = i;
                    game.time.removeAll();
                    fillTiles();
                    break;
                }
            }
        }
    }

    function getEdges(tile_index) {

        /*
            Each number in this array represnts the binary
            number that corresponds to which edges of a
            tile has an inlet/outlet starting with the North
            edge and going clockwise around. Example:
            For the straight pipe that goes up and down there
            are in/outlets on the North and South edges so it
            is represented by 1010 in binary which is 10 in
            decimal.
        */
        tileEdges = [
            12, 12, 13, 13, 10, 10, 0, 0, 0, 0, 2, 2,
             6,  6, 14, 14,  5,  5, 0, 0, 0, 0, 1, 1,
             3,  3,  7,  7, 10, 10, 0, 0, 0, 0, 8, 8,
             9,  9, 11, 11,  5,  5, 0, 0, 0, 0, 4, 4
        ];
        edges = [ 0, 0, 0, 0];
        whichEdges = tileEdges[tile_index];
        for (var i = 0; i < 4; ++i) {
            if (whichEdges % 2 == 1) ++edges[3 - i];
            whichEdges = Math.floor(whichEdges / 2);
        }
        //console.log( 'getEdges(' + tile_index + ') = ' + edges );
        return edges;
    }

    function floodFillTiles(tiles, from, edges, visited) {

        tiles_to_check = [];
        if (edges[0] == 1) {
            if (getEdges(tiles[from-(COLS+2)])[2] == 1)
                tiles_to_check.push(from - (COLS+2));
        }
        if (edges[1] == 1) {
            if (getEdges(tiles[from+1])[3] == 1)
                tiles_to_check.push(from + 1);
        }
        if (edges[2] == 1) {
            if (getEdges(tiles[from+(COLS+2)])[0] == 1)
                tiles_to_check.push(from + (COLS+2));
        }
        if (edges[3] == 1) {
            if (getEdges(tiles[from-1])[1] == 1)
                tiles_to_check.push(from - 1);
        }

        for(var i=0; i<tiles_to_check.length; ++i) {
            var tile_to_check = tiles_to_check[i];
            var tile_index = tiles[tile_to_check];
            if (tile_index != -1 && visited.indexOf(tile_to_check) == -1) {
                var new_edges = getEdges(tile_index);
                if (tile_index % 2 == 0) {
                    // make sure the tile is displaying as filled
                    var orig_tile = tile_to_check;
                    for (var j=1; j<ROWS; ++j) {
                        if (orig_tile >= 1 + (j+1)*(COLS + 2) - 2 * (j-1)) orig_tile -= 2;
                    }
                    orig_tile = orig_tile - 3 - COLS;
                    if (orig_tile != hole)
                        map.putTile( tile_index + 1, orig_tile % COLS, Math.floor(orig_tile / COLS) );
                    if (orig_tile == sink)
                        console.log('Victory!');
                }
                visited.push(tile_to_check);
                game.time.events.add(Phaser.Timer.SECOND / 10, floodFillTiles, this, tiles, tile_to_check, new_edges, visited);
            }
        }

    }

    function fillTiles() {

        tiles = layer1.getTiles(0, 0, TILE_SIZE * COLS, TILE_SIZE * ROWS);
        for (var i=0; i<tiles.length; ++i) {
            if (tiles[i].index % 2 == 1 && i != source) {
                map.putTile(tiles[i].index - 1, i % COLS, Math.floor(i/COLS));
            } else if (i == source && tiles[i].index % 2 == 0) {
                map.putTile(tiles[i].index + 1, i % COLS, Math.floor(i/COLS));
            }
        }
        var start_tile_index = tiles[source].index;
        var start_tile;
        var padded_tiles = [];
        for (var i=0; i<(ROWS+2)*(COLS+2); ++i) {
            padded_tiles.push(-1);
        }
        for (var i=0; i<ROWS*COLS; ++i) {
            var padded_index = COLS + 3 + i;
            for (var j=1; j<ROWS; ++j) {
                if (i >= j * COLS) padded_index += 2;
            }
            padded_tiles[padded_index] = tiles[i].index
            if (i == source) start_tile = padded_index;
        }
        floodFillTiles(padded_tiles, start_tile, getEdges(start_tile_index), [ start_tile ]);
    }

    function updateMarker() {

        marker.x = layer1.getTileX(game.input.activePointer.worldX) * TILE_SIZE;
        marker.y = layer1.getTileY(game.input.activePointer.worldY) * TILE_SIZE;
    }

    function tileClick() {

        if (marker.x > TILE_SIZE * COLS || marker.y > TILE_SIZE * ROWS) return;
        tileX = layer1.getTileX(marker.x);
        tileY = layer1.getTileX(marker.y);
        tiles = layer1.getTiles(0, 0, TILE_SIZE * COLS, TILE_SIZE * ROWS);
        tile_index = tiles[tileY * COLS + tileX].index;
        if (tile_index != -1) {
            game.time.removeAll();
            map.putTile((tile_index + 12) % 48,
                        tileX,
                        tileY);
        }
        fillTiles();
    }

    function createTileSelector() {

        marker = game.add.graphics();
        marker.lineStyle(2, 0x000000, 1);
        marker.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    }

};
