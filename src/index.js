import React, { Component } from 'react';
import { render } from 'react-dom';
import styles from './index.module.scss';
import info from './assets/info.png';
import SamplesManager from './music/samples-manager';
import Renderer from './renderer';
import playSvg from './assets/play.png';
import pauseSvg from './assets/pause.png';

const genres = [
  'World',
  'Country',
  'Punk',
  'Folk',
  'Pop',
  'NewAge',
  'Rock',
  'Metal',
  'Latin',
  'Blues',
  'Electronic',
  'RnB',
  'Rap',
  'Reggae',
  'Jazz',
];

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      playing: false,
      dragging: false,
      loadingProgress: 0,
      loadingSamples: true,
      currentTableIndex: 4,
      gate: 0.2,
      bpm: 120,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      },
    };

    this.samplesManager = new SamplesManager((i) => {
      this.handleLoadingSamples(i);
    }),
    this.canvas = [];
    this.matrix = [];
    this.rawMatrix = [];
    this.beat = 0;
    // this.serverUrl = 'http://140.109.16.227:5002/';
    // this.serverUrl = 'http://140.109.135.76:5010/';
    this.serverUrl = 'http://musicai.citi.sinica.edu.tw/drumvae/';
  }

  componentDidMount() {
    this.renderer = new Renderer(this.canvas);
    if (!this.state.loadingSamples) {
      this.renderer.draw(this.state.screen);
    }
    window.addEventListener('keydown', this.onKeyDown.bind(this), false);
    window.addEventListener('resize', this.handleResize.bind(this, false));
    window.addEventListener('click', this.handleClick.bind(this));
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));

    requestAnimationFrame(() => { this.update() });
    this.getDrumVaeStatic();
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('click', this.handleClick.bind(this));
    window.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this, false));
  }

  changeMatrix(mat) {
    this.rawMatrix = mat;
    this.updateMatrix()
  }

  updateMatrix() {
    const { gate } = this.state;
    const m = this.rawMatrix.map(
      c => c.map(x => (x > gate ? 1 : 0)
    ));
    this.matrix = m;
    this.renderer.changeMatrix(m);
    this.samplesManager.changeMatrix(m);
  }

  getDrumVae(url, restart = true) {
    fetch(url, {
      headers: {
        'content-type': 'application/json'
      },
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
    })
      .then(r => r.json())
      .then(d => {
        this.changeMatrix(d['result']);
        this.renderer.latent = d['latent'];
        if (restart) {
          this.samplesManager.start();
        }
      })
      .catch(e => console.log(e));
  }

  getDrumVaeRandom() {
    const url = this.serverUrl + 'rand';
    this.getDrumVae(url);
  }

  getDrumVaeStatic() {
    const url = this.serverUrl + 'static';
    this.getDrumVae(url);
  }

  getDrumVaeStaticShift(dir = 0, step = 0.2) {
    const url = this.serverUrl + 'static/' + dir.toString() + '/' + step.toString();
    this.getDrumVae(url);
  }

  setDrumVaeGenre(g = 10) {
    const url = this.serverUrl + 'adjust-genre/' + g.toString();
    this.getDrumVae(url);
  }

  getDrumVaeAdjust(dim, value) {
    const url = this.serverUrl + 'adjust-latent/' + dim.toString() + '/' + value.toString();
    this.getDrumVae(url, false);
  }

  getDrumVaeAdjustData(i, j, value) {
    const url = this.serverUrl
      + 'adjust-data/'
      + i.toString()
      + '/'
      + j.toString()
      + '/'
      + value.toString();
    this.getDrumVae(url, false);
  }

  update() {
    const b = this.samplesManager.beat;
    if (!this.state.loadingSamples) {
      this.renderer.draw(this.state.screen, b);
    }
    requestAnimationFrame(() => { this.update() });
  }

  handleResize(value, e) {
    this.setState({
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      }
    });
  }

  handleClick(e) {
    e.stopPropagation();
    // const index = this.renderer.handleClick(e);
    // this.changeTableIndex(index);
  }

  handleMouseDown(e) {
    e.stopPropagation();
    const [dragging, onGrid] = this.renderer.handleMouseDown(e);
    if (onGrid) {
      // console.log('send pattern');
      const [i, j_reverse] = this.renderer.mouseOnIndex;
      const j = 8 - j_reverse;
      this.rawMatrix[i][j] = (this.rawMatrix[i][j] < this.state.gate ? 1 : 0);
      this.updateMatrix();
      this.getDrumVaeAdjustData(i, j, this.rawMatrix[i][j])
    }
    if (dragging) {
      this.setState({
        dragging,
      });
    }
  }

  handleMouseUp(e) {
    e.stopPropagation();
    // const dragging = this.renderer.handleMouseDown(e);
    const { selectedLatent, latent } = this.renderer;
    if (this.state.dragging) {
      this.getDrumVaeAdjust(selectedLatent, latent[selectedLatent]);
    }

    this.setState({
      dragging: false,
    });
  }

  handleMouseMove(e) {
    e.stopPropagation();
    if (this.state.dragging) {
      this.renderer.handleMouseMoveOnGraph(e);
    } else {
      this.renderer.handleMouseMove(e);
    }
  }

  handleClickMenu() {
    const { open } = this.state;
    if (open) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  onKeyDown(e) {
    e.stopPropagation();
    const { loadingSamples } = this.state;
    if (!loadingSamples) {
      console.log(`key: ${e.keyCode}`);
      if (e.keyCode === 32) {
        // space
        const playing = this.samplesManager.trigger();
        this.setState({
          playing,
        });
      }
      if (e.keyCode === 65) {
        // a
        this.renderer.triggerDisplay();
      }
      if (e.keyCode === 82) {
        // r
        this.getDrumVaeRandom();
      }


      if (e.keyCode === 49) {
        this.setDrumVaeGenre(genres.indexOf('Pop'));
      }
      if (e.keyCode === 50) {
        this.setDrumVaeGenre(genres.indexOf('Rock'));
      }
      if (e.keyCode === 51) {
        this.setDrumVaeGenre(genres.indexOf('Jazz'));
      }
      if (e.keyCode === 52) {
        this.setDrumVaeGenre(genres.indexOf('Electronic'));
      }

    }
  }

  changeTableIndex(currentTableIndex) {
    this.samplesManager.changeTable(this.matrix[currentTableIndex]);
    this.setState({
      currentTableIndex,
    });
  }

  openMenu() {
    document.getElementById('menu').style.height = '100%';
    this.setState({
      open: true,
    });
  }

  closeMenu() {
    document.getElementById('menu').style.height = '0%';
    this.setState({
      open: false,
    });
  }

  handleLoadingSamples(amt) {
    this.setState({
      loadingProgress: amt,
    });
    if (amt === 8) {
      const playing = this.samplesManager.trigger();
      this.setState({
        playing,
        loadingSamples: false,
      });
    }
  }

  handleChangeGateValue(e) {
    const v = e.target.value;
    const gate = v / 100;
    console.log(`gate changed: ${gate}`);
    this.setState({ gate });
    this.updateMatrix();
  }

  handleChangeBpmValue(e) {
    const v = e.target.value;
    // 0~100 -> 60~120
    const bpm = v;
    console.log(`bpm changed: ${bpm}`);
    this.setState({ bpm });
    this.samplesManager.changeBpm(bpm);
  }

  handleClickPlayButton() {
    const playing = this.samplesManager.trigger();
    this.setState({
      playing,
    });
  }

  render() {
    const loadingText = `loading..${this.state.loadingProgress}/9`;
    const { playing, currentTableIndex } = this.state;
    const arr = Array.from(Array(9).keys());
    const mat = Array.from(Array(9 * 16).keys());
    const { gate, bpm } = this.state;
    return (
      <div>
        <div className={styles.title}>
          <a href="https://github.com/vibertthio/looop" target="_blank" rel="noreferrer noopener">
            Drum VAE | MAC Lab
          </a>
          <button
            className={styles.btn}
            onClick={() => this.handleClickMenu()}
            onKeyDown={e => e.preventDefault()}
          >
            <img alt="info" src={info} />
          </button>
        </div>
        <div>
          {this.state.loadingSamples && (
            <div className={styles.loadingText}>
              <p>{loadingText}</p>
            </div>
          )}
        </div>
        <div>
          <canvas
            ref={ c => this.canvas = c }
            className={styles.canvas}
            width={this.state.screen.width * this.state.screen.ratio}
            height={this.state.screen.height * this.state.screen.ratio}
          />
        </div>
        <div className={styles.control}>
          <div className={styles.slider}>
            <input type="range" min="1" max="100" value={gate * 100} onChange={this.handleChangeGateValue.bind(this)}/>
            <button onClick={this.handleClickPlayButton.bind(this)} onKeyDown={e => e.preventDefault()}>
              {
                !this.state.playing ?
                  (<img src={playSvg} width="30" height="30" alt="submit" />) :
                  (<img src={pauseSvg} width="30" height="30" alt="submit" />)
              }
            </button>
            <input type="range" min="60" max="180" value={bpm} onChange={this.handleChangeBpmValue.bind(this)}/>
          </div>
        </div>
        {/* <div className={styles.foot}>
          <a href="https://vibertthio.com/portfolio/" target="_blank" rel="noreferrer noopener">
            Vibert Thio
          </a>
        </div> */}
        <div id="menu" className={styles.overlay}>
          <button className={styles.overlayBtn} onClick={() => this.handleClickMenu()} />
          <div className={styles.intro}>
            <p>
              <strong>$ Drum VAE $</strong> <br />Press space to play/stop the music. Click on any block to change samples. Made by{' '}
              <a href="https://vibertthio.com/portfolio/" target="_blank" rel="noreferrer noopener">
                Vibert Thio
              </a>.{' Source code is on '}
              <a
                href="https://github.com/vibertthio"
                target="_blank"
                rel="noreferrer noopener"
              >
                GitHub.
              </a>
            </p>
            <p>
              <strong>$ How to use $</strong>
              <br /> [space]: play/pause
              <br /> [r]: random sample
              <br /> [drag]: rag the circular diagram to change the latent vector
              <br /> [click]: click to change the drum pattern
            </p>
          </div>
          <button className={styles.overlayBtn} onClick={() => this.handleClickMenu()} />
        </div>
      </div>
    );
  }
}

render(<App />, document.getElementById('root'));
