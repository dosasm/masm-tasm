import React, { useEffect, useState } from "react";
import { profiles } from "./bundle.config.json";
import "./App.css";
import { EmulatorFunction } from "emulators-ui/dist/types/js-dos";

import DosPlayer from "./dos-player";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@material-ui/core";
import GitHubIcon from '@material-ui/icons/GitHub';
import CodeEditor from "@uiw/react-textarea-code-editor";
import { BundleZip } from "./bundle";
import { ActionButtons } from "./actionButtons";

const bun = new BundleZip();

function App() {
  const [mode, setMode] = useState<EmulatorFunction>("dosboxWorker");
  let params = (new URL(document.location.toString())).searchParams;
  const baseState = {
    env: 0,
    code: "",
    envBaseCode: true
  };
  if (params.has('env')) {
    const idx = profiles.findIndex(val => val.label === params.get('env')?.replace(/[ |_|-]/, ' '));
    if (idx >= 0) {
      baseState.env = idx;
    }
  }

  const [env, setEnv] = useState(baseState.env);
  const profile = profiles[env];
  const lang = profile.CodeLanguage;
  const [code, setCode] = useState<string>(baseState.code);
  const [bundle, setBundle] = useState<Uint8Array | undefined>(undefined);

  useEffect(() => {
    bun.download(profile.baseBundle).then(
      async () => {
        const params = (new URL(document.location.toString())).searchParams;
        let text = undefined;

        //read sample file in the bundle or use param
        if (params.has('code')) {
          text = params.get('code') as string;
        }
        else if (profile.CodePath) {
          text = await bun.readFile(profile.CodePath);
        }
        else if (profile.baseCode) {
          text = profile.baseCode;
        }

        //set editor code and exec command for the code
        let setBundled = false;
        if (text) {
          setCode(text);
          //exec command for exec param
          if (params.has('exec')) {
            const idx = profile.actions.findIndex(val => val.label.toLowerCase() === params.get('exec')?.toLowerCase());
            if (idx >= 0) {
              const action = profile.actions[idx];
              const _bundle = await bun.getBundle(action.command, {
                path: action.CodeDestination,
                text,
              });
              setBundle(_bundle);
              setBundled = true;
            }
          }
        }
        if (setBundled === false) {
          const _bundle = await bun.getBundle();
          setBundle(_bundle);
        }
      }
    );
  }, [profile, baseState.envBaseCode]);

  const selectors =
    <div style={{ float: "left" }}>
      <FormControl>
        <InputLabel id="select-jsdos-bundle-label">
          environment
        </InputLabel>
        <Select
          labelId="select-jsdos-bundle"
          id="select-bundle"
          value={env}
          onChange={(val) => {
            setEnv(val.target.value as number);
          }}
        >
          {profiles.map((val, idx) => (
            <MenuItem value={idx} key={val.label}>
              {val.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl id="mode-selector">
        <InputLabel id="select-mode-label">Mode</InputLabel>
        <Select
          id="select-mode"
          value={mode}
          onChange={(val) => {
            setMode(val.target.value as EmulatorFunction);
          }}
        >
          <MenuItem value={"dosboxWorker"}>Worker</MenuItem>
          <MenuItem value={"dosboxDirect"}>Direct</MenuItem>
        </Select>
      </FormControl>
    </div>


  const operations = [
    {
      name: "editor-clean",
      label: "clean",
      "zh-CN": "清空编辑器",
      action: () => { setCode("") }
    },
    // {
    //   name: "editor-upload",
    //   label: "upload",
    //   "zh-CN": "上传文件",
    //   action: () => { setCode("") }
    // },
    {
      name: "editor-download",
      label: "download",
      "zh-CN": "作为文件下载",
      action: () => {
        //https://blog.csdn.net/zhang__ao/article/details/82625606
        function download(filename: string, text: string) {
          var element = document.createElement('a');
          element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
          element.setAttribute('download', filename);

          element.style.display = 'none';
          document.body.appendChild(element);

          element.click();

          document.body.removeChild(element);
        }
        let filename = new Date().toLocaleString() + "." + profile.codeExt;
        download(filename, code);
      }
    },
    ...profile.actions.map(
      (val, idx) => {
        return {
          name: 'exec-' + val.label,
          label: val.label,
          "zh-CN": val["zh-cn"],
          action: async () => {
            const action = profile.actions[idx];
            const _bundle = await bun.getBundle(action.command, {
              path: action.CodeDestination,
              text: code,
            });
            if (_bundle) setBundle(_bundle);
          }
        }
      }
    )
  ]

  return (
    <>
      <div className="ground-Container">
        <div className="ground-selectors">
          {selectors}
        </div>

        <div className="ground-buttons">
          <ActionButtons
            options={operations}
          ></ActionButtons>
        </div>

        <div className="ground-dosbox">
          {bundle !== undefined ? <DosPlayer bundle={bundle} dosboxFunction={mode} /> : <></>}
        </div>

        <div className="ground-editor">
          <CodeEditor
            autoFocus
            value={code}
            language={lang}
            placeholder="Please enter your code."
            onChange={(evn) => setCode(evn.target.value)}
            minHeight={80}
            padding={15}
            style={{
              fontSize: 12,
              backgroundColor: "#f5f5f5",
              fontFamily:
                "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
            }}
          />
        </div>
      </div>
      <footer>
        <Typography>
          {new Date().getFullYear()}
          <a href="https://github.com/dosasm/dosrun/tree/main/react-app"><GitHubIcon htmlColor='black'></GitHubIcon></a>
          <a href="https://dosasm.github.io/docs/tutorial-playGround/playGround">docs</a>
        </Typography>
      </footer>
    </>
  );
}

export default App;
