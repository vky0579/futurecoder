import React from 'react';
import Terminal from './shell/Terminal';
import {rpc} from "./rpc";
import "./css/main.scss"
import "./css/github-markdown.css"
import {connect} from "react-redux";
import {bookSetState, bookState, closeMessage, movePage, moveStep, ranCode, setDeveloperMode, stepIndex} from "./book/store";
import Popup from "reactjs-popup";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-monokai";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {
  faBars,
  faBug,
  faCog,
  faListOl,
  faPlay,
  faSignOutAlt,
  faTimes,
  faUser,
  faUserGraduate
} from '@fortawesome/free-solid-svg-icons'
import {animateScroll} from "react-scroll";
import {HintsPopup} from "./Hints";
import Toggle from 'react-toggle'
import "react-toggle/style.css"
import {ErrorModal, FeedbackModal} from "./Feedback";
import birdseyeIcon from "./img/birdseye_icon.png";
import _ from "lodash";


class AppComponent extends React.Component {
  constructor(props) {
    super(props)
    this.terminal = React.createRef()
  }

  runCode({code, source}) {
    const shell = source === "shell";
    if (!shell && !code) {
      code = bookState.editorContent;
    }
    if (!code.trim()) {
      return;
    }
    bookSetState("processing", true);
    rpc(
      "run_code",
      {code, source, page_index: bookState.page_index, step_index: stepIndex()},
      (data) => {
        if (!shell) {
          this.terminal.current.clearStdout();
        }
        bookSetState("processing", false);

        ranCode(data);
        const terminal = this.terminal.current;
        terminal.pushToStdout(data.result);
        animateScroll.scrollToBottom({duration: 30, container: terminal.terminalRoot.current});
        terminal.focusTerminal();
        
        if (data.birdseye_url) {
          window.open(data.birdseye_url);
        }
      },
    );
  }

  render() {
    const {
      numHints,
      editorContent,
      messages,
      pages,
      solution,
      requestingSolution,
      user,
      rpcError,
      page_index,
    } = this.props;
    const page = pages[page_index];
    const step_index = stepIndex();
    const step = page.steps[step_index];
    const showEditor = page_index >= _.findIndex(pages, {slug: "WritingPrograms"});
    const snoopPageIndex = _.findIndex(pages, {slug: "UnderstandingProgramsWithSnoop"});
    const showSnoop = page_index > snoopPageIndex ||
      (page_index === snoopPageIndex && step_index >= 1);
    const showPythonTutor = page_index >= _.findIndex(pages, {slug: "UnderstandingProgramsWithPythonTutor"});
    const showBirdseye = true;

    return <div className="book-container">
      <div className="book-text markdown-body">
        <h1 dangerouslySetInnerHTML={{__html: page.title}}/>
        {page.steps.slice(0, step_index + 1).map((part, index) =>
          <div key={index} id={`step-text-${index}`}>
            <div dangerouslySetInnerHTML={{__html: part.text}}/>
            <hr/>
          </div>
        )}
        {
          messages.map((message, index) =>
            <div key={index} className="card book-message">
              <div
                className="card-header"
                onClick={() => closeMessage(index)}>
                <FontAwesomeIcon icon={faTimes}/>
              </div>
              <div className="card-body" 
                   dangerouslySetInnerHTML={{__html: message}}/>
            </div>
          )
        }
        <div>
          {page_index > 0 &&
          <button className="btn btn-primary btn-sm" onClick={() => movePage(-1)}>Previous</button>}
          {" "}
          {page_index < pages.length - 1 && step_index === page.steps.length - 1 &&
          <button className="btn btn-success" onClick={() => movePage(+1)}>Next</button>}
        </div>
        <br/>
        {
          user.developerMode && <StepButtons/>
        }
      </div>
      <div className="ide">
        <div className={"editor-buttons " + (showEditor ? "" : "invisible")}>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.runCode({source: "editor"});
            }}
          >
            <FontAwesomeIcon icon={faPlay}/> Run
          </button>

          {" "}

          {showSnoop &&
          <button
            className="btn btn-success"
            onClick={() => {
              this.runCode({source: "snoop"})
            }}
          >
            <FontAwesomeIcon icon={faBug}/> Snoop
          </button>}

          {" "}

          {showPythonTutor &&
          <button
            className="btn btn-success"
            onClick={() => {
              this.runCode({source: "pythontutor"});
              window.open(
                'https://pythontutor.com/iframe-embed.html#code=' +
                escape(bookState.editorContent) +
                '&codeDivHeight=600' +
                '&codeDivWidth=600' +
                '&cumulative=false' +
                '&curInstr=0' +
                '&heapPrimitives=false' +
                '&origin=opt-frontend.js' +
                '&py=3' +
                '&rawInputLstJSON=%5B%5D' +
                '&textReferences=false',
              );
            }}
          >
            <FontAwesomeIcon icon={faUserGraduate}/> Python Tutor
          </button>}

          {" "}

          {showBirdseye &&
          <button
            className="btn btn-success"
            onClick={() => {
              this.runCode({source: "birdseye"})
            }}
          >
            {<img
              src={birdseyeIcon}
              width={20}
              height={20}
              alt="birdseye logo"
              style={{position: "relative", top: "-2px"}}/>} Birdseye
          </button>}

        </div>
        <div className="editor-and-terminal">
          <div className={"editor " + (showEditor ? "" : "invisible")}>
            <AceEditor
              mode="python"
              theme="monokai"
              onChange={(value) => {
                bookSetState("editorContent", value);
              }}
              value={editorContent}
              name="editor"
              height="100%"
              width="100%"
              onLoad={(editor) => {
                editor.renderer.setScrollMargin(10);
                editor.renderer.setPadding(10);
              }}
            />
          </div>
          <div className="terminal">
            <Terminal
              onCommand={(cmd) => this.runCode({code: cmd, source: "shell"})}
              ref={this.terminal}
            />
          </div>
        </div>
      </div>

      <HintsPopup
        hints={step.hints}
        numHints={numHints}
        requestingSolution={requestingSolution}
        solution={solution}
      />

      <MenuPopup
        user={user}
      />

      <ErrorModal error={rpcError}/>
    </div>
  }
}

const StepButton = ({delta, label}) =>
  <button className="btn btn-danger btn-sm"
          onClick={() => moveStep(delta)}>
    {label}
  </button>

const StepButtons = () =>
  <div style={{position: "fixed", bottom: 0}}>
    <StepButton delta={-1} label="Reverse step"/>
    {" "}
    <StepButton delta={+1} label="Skip step"/>
  </div>


const MenuPopup = ({user}) =>
  <div className="custom-popup">
    <Popup
      trigger={
        <button className="btn menu-icon">
          <FontAwesomeIcon icon={faBars} size="lg"/>
        </button>}
    >
      <div className="menu-popup">
        <p><FontAwesomeIcon icon={faUser}/> {user.email}</p>
        <p><a href="/accounts/logout/"> <FontAwesomeIcon icon={faSignOutAlt}/> Sign out</a></p>
        <p>
          <Popup
            trigger={<a href="#"><FontAwesomeIcon icon={faCog}/> Settings </a>}
            modal
            closeOnDocumentClick
          >
            <SettingsModal user={user}/>
          </Popup>
        </p>
        <p>
          <Popup
            trigger={<a href="#"><FontAwesomeIcon icon={faBug}/> Feedback </a>}
            modal
            closeOnDocumentClick
          >
            {close => <FeedbackModal close={close}/>}
          </Popup>
        </p>
        <p><a href="/toc/"> <FontAwesomeIcon icon={faListOl}/> Table of Contents</a></p>
      </div>
    </Popup>
  </div>


const SettingsModal = ({user}) => (
  <div className="settings-modal">
    <h1>Settings</h1>
    <br/>
    <label>
      <Toggle
        defaultChecked={user.developerMode}
        onChange={(e) => setDeveloperMode(e.target.checked)}
      />
      <b>Developer mode</b>
    </label>

    <p>Enables the "Reverse step" and "Skip step" buttons.</p>
  </div>
)


export const App = connect(
  state => ({
    ...state.book,
    rpcError: state.rpc.error,
  }),
)(AppComponent);
