/* eslint react/no-unused-state: 0 */
import React, { Component } from "react";
import PropTypes from "prop-types";
import { BackgroundImage, PageContainer } from "../../components/Containers";
import NowPlaying from "../../components/NowPlaying";
import TrackProgress from "../../components/TrackProgress";
import { BodyText } from "../../components/Typography";

export default class PlayerPage extends Component {
  static propTypes = {
    token: PropTypes.string.isRequired,
    onAuthError: PropTypes.func.isRequired,
  };

  static ARTIST_PLACEHOLDER = "Artist";
  static TRACK_PLACEHOLDER = "Track Name";

  static PLAYER_UPDATE_INTERVAL = 400;

  constructor(props) {
    super(props);
    this.state = {
      player: null,
      error: "",
      deviceId: "",
      currentTrack: {
        name: PlayerPage.TRACK_PLACEHOLDER,
        artist: PlayerPage.ARTIST_PLACEHOLDER,
      },
      position: 0,
      duration: 0,
      isPlaying: false,
    };
    this.checkPlayer = setInterval(() => this.checkForPlayer(), 2000);
    this.pageEl = document.querySelector(".page-container");
    this.playerUpdate = null;
  }

  onPlayerError(error) {
    this.setState({ error });
  }

  async getState(newState = null) {
    console.log("getting state...");
    if (newState) {
      clearInterval(this.playerUpdate);
    }
    try {
      const state = newState || (await this.player.getCurrentState());
      if (state === null) {
        this.setState({ error: "Not currently connected :(" });
      } else {
        const { current_track: currentTrack } = state.track_window;
        const artist = currentTrack.artists.map(a => a.name).join(", ");
        const track = currentTrack.name;
        const albumArt = currentTrack.album.images.sort(
          (a, b) => b.height + b.width - (a.height + a.width),
        )[0].url;
        await this.setState({
          currentTrack: {
            ...currentTrack,
            track,
            artist,
            album: currentTrack.album.name,
            albumArt,
          },
          isPlaying: !state.paused,
          position: state.position,
          duration: state.duration,
          error: "",
        });
      }
    } catch (err) {
      console.error(typeof err === "string" ? err : err.message);
      await this.setState({
        currentTrack: {
          track: PlayerPage.TRACK_PLACEHOLDER,
          artist: PlayerPage.ARTIST_PLACEHOLDER,
        },
      });
    }
    if (!this.playerUpdate) {
      this.playerUpdate = setInterval(
        () => this.getState(),
        PlayerPage.PLAYER_UPDATE_INTERVAL,
      );
    }
  }

  async switchPlayback() {
    const { token } = this.props;
    const { deviceId } = this.state;
    fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false,
      }),
    });
  }

  initializePlayerHandlers() {
    this.player.on("initialization_error", e => this.onPlayerError(e));
    this.player.on("authentication_error", e => {
      this.onPlayerError(`Authentication error: ${e.message}`);
      this.props.onAuthError(e);
    });
    this.player.on("player_state_changed", state => this.getState(state));
    this.player.on("account_error", e =>
      this.onPlayerError(`account error: ${e.message}`),
    );
    this.player.on("playback_error", e =>
      this.onPlayerError(`playback error: ${e.message}`),
    );
    this.player.on("ready", async data => {
      await this.setState({ deviceId: data.device_id });
      await this.switchPlayback();
      await this.getState();
      this.playerUpdate = setInterval(
        async () => this.getState(),
        PlayerPage.PLAYER_UPDATE_INTERVAL,
      );
    });
    this.player.connect();
  }

  checkForPlayer() {
    if (window.Spotify) {
      const { token } = this.props;

      this.player = new window.Spotify.Player({
        name: "Jukeify Online Player",
        getOAuthToken: cb => {
          cb(token);
        },
      });
      this.initializePlayerHandlers();
      this.forceUpdate();
      clearInterval(this.checkPlayer);
    }
  }

  render() {
    const {
      error,
      deviceId,
      currentTrack,
      isPlaying,
      position,
      duration,
    } = this.state;
    const { artist, name: trackName, albumArt, album } = currentTrack;
    return (
      <PageContainer>
        <BackgroundImage imgUrl={albumArt} />
        {!deviceId && <BodyText>Awaiting player connection...</BodyText>}
        {error && <BodyText>Error: {error}</BodyText>}
        <NowPlaying
          artists={artist}
          trackName={trackName}
          albumName={album}
          albumArtUrl={albumArt}
          isPlaying={isPlaying}
          onPlayClick={() => this.player.togglePlay()}
          onPrevClick={() => this.player.previousTrack()}
          onNextClick={() => this.player.nextTrack()}
        />
        <TrackProgress position={position} duration={duration} />
      </PageContainer>
    );
  }
}
