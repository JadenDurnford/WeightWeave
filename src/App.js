import { useState } from "react";
import DatePicker from "react-date-picker";
import moment from "moment";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Arweave from "arweave";
import ArDB from "ardb";

export default function App() {
  const arweave = Arweave.init();
  const arweaveInstance = Arweave.init({});
  const ardb = new ArDB(arweaveInstance);
  const [weight, setWeight] = useState(0);
  const [date, setDate] = useState(new Date());
  const [weightRecord, setWeightRecord] = useState([]);
  const [graphWeightRecord, setGraphWeightRecord] = useState([]);
  const [user, setUser] = useState({
    loggedin: false,
    wallet: null,
    key: null,
    bal: 0,
  });

  function userLogin() {
    if (user.loggedin === true) {
      let newUser = user;
      newUser = {
        loggedin: false,
        wallet: null,
        key: null,
        bal: 0,
      };
      setUser(newUser);

      const title = document.getElementById("title");
      title.classList.remove("titleAnimate");

      const headerBox = document.getElementById("header");
      headerBox.classList.remove("headerAnimateUp");
      headerBox.classList.add("headerAnimateDown");

      const login = document.getElementById("loginBox");
      login.classList.remove("loginAnimate");

      const weightTracker = document.getElementById("weightTrackerMain");
      const logButton = document.getElementById("login");
      weightTracker.classList.add("hidden");
      logButton.innerHTML = "Login";

      const keyFileContainer = document.getElementById("keyFileContainer");
      keyFileContainer.classList.add("hidden");

      const keyFile = document.getElementById("keyFile");
      keyFile.value = "";
    } else {
      const keyFileContainer = document.getElementById("keyFileContainer");
      keyFileContainer.classList.remove("hidden");

      const fileUpload = document.getElementById("custom-file-upload");
      fileUpload.classList.remove("uploadAnimate");
    }
  }

  function keyFileCheck(e) {
    var reader = new FileReader();
    reader.onload = keyFileCheckOnload;
    try {
      reader.readAsText(e.target.files[0]);
    } catch (e) {}
  }

  async function keyFileCheckOnload(e) {
    const key = JSON.parse(e.target.result);
    try {
      let newUserKey = user;
      newUserKey.key = key;
      setUser(newUserKey);
      await arweave.wallets.jwkToAddress(key).then((address) => {
        let newUser = user;
        newUser.wallet = address;
        setUser(newUser);
      });
      await arweave.wallets.getBalance(user.wallet).then((balance) => {
        let newUser = user;
        newUser.bal = balance;
        setUser(newUser);
      });
      if (user.bal !== 0) {
        let newUser = user;
        newUser.loggedin = true;
        setUser(newUser);
        const weightTracker = document.getElementById("weightTrackerMain");
        const loginButton = document.getElementById("login");
        const keyFileContainer = document.getElementById("keyFileContainer");
        const headerBox = document.getElementById("header");
        const title = document.getElementById("title");
        const login = document.getElementById("loginBox");
        const fileUpload = document.getElementById("custom-file-upload");

        weightTracker.classList.remove("hidden");
        loginButton.innerHTML = "Logout";
        keyFileContainer.classList.add("hidden");
        headerBox.classList.add("headerAnimateUp");
        headerBox.classList.remove("headerAnimateDown");
        title.classList.add("titleAnimate");
        login.classList.add("loginAnimate");
        fileUpload.classList.add("uploadAnimate");
        retrieveData();
      } else {
        alert("Please select an account with a balance greater than 0AR");
      }
    } catch (e) {
      alert("Please Select A Valid Key File");
      const keyFile = document.getElementById("keyFile");
      keyFile.value = "";
    }
  }

  function graphFormatter(e) {
    if (user.loggedin === false) {
      return;
    }
    let formattedRecord = [];
    for (let i = 0; i < e.length; i++) {
      formattedRecord = formattedRecord.concat({
        date: moment(e[i].date).format("YYYY/MM/DD"),
        weight: e[i].weight,
      });
    }
    setGraphWeightRecord(formattedRecord);
  }

  async function submitData() {
    if (user.loggedin === false) {
      return;
    }
    const JSONED = JSON.stringify(weightRecord);
    let transaction = await arweave.createTransaction(
      {
        data: JSONED,
      },
      user.key
    );

    transaction.addTag("Content-Type", "text/plain");
    transaction.addTag("Weave-App", "weightweave");

    await arweave.transactions.sign(transaction, user.key);

    const response = await arweave.transactions.post(transaction);

    console.log(transaction);

    if (response.status === 200) {
      alert(
        "Your data has been uploaded, please wait for the next block to be mined for it to be synced"
      );
    } else if (response.status === 400) {
      alert(
        "Your data could not be uploaded, please ensure you have sufficient funds to cover the tx fee"
      );
    } else {
      alert(
        "Your data could not be uploaded, please try again in a couple minutes"
      );
    }
  }

  async function retrieveData() {
    if (user.loggedin === false) {
      console.log("stop!");
      return;
    }
    const txs = await ardb
      .search("transactions")
      .from(user.wallet)
      .tag("Weave-App", "weightweave")
      .findOne();
    await arweave.transactions
      .getData(txs[0].node.id, { decode: true, string: true })
      .then((data) => {
        let newRecord = JSON.parse(data);
        let filteredRecord = [];
        for (let i = 0; i < newRecord.length; i++) {
          filteredRecord = filteredRecord.concat({
            date: newRecord[i].date,
            weight: parseInt(newRecord[i].weight, 10),
          });
        }
        console.log(txs);
        setWeightRecord(filteredRecord);
        graphFormatter(filteredRecord);
      });
    await arweave.wallets.getBalance(user.wallet).then((balance) => {
      let newUser = user;
      newUser.bal = balance;
      setUser(newUser);
    });
  }

  async function addWeightRecord() {
    if (user.loggedin === false) {
      return;
    }
    try {
      if (
        isNaN(weight) ||
        weight > 999 ||
        weight.toString() === "" ||
        weight === 0 ||
        weight.toString().includes(" ")
      ) {
        alert("Please enter a valid number for your weight");
        return;
      }
      let newWeight = parseInt(weight, 10);
      let newWeightRecord = weightRecord;
      let filteredWeightRecord = [];

      for (var i = 0; i < weightRecord.length; i++) {
        if (weightRecord[i].date === moment(date).format("YYYYMMDD")) {
          for (let j = 0; j < newWeightRecord.length; j++) {
            if (j !== i) {
              filteredWeightRecord.push(newWeightRecord[j]);
            }
            if (j === newWeightRecord.length - 1) {
              filteredWeightRecord.push({
                date: moment(date).format("YYYYMMDD"),
                weight: newWeight,
              });
            }
          }
          setWeightRecord(filteredWeightRecord);
          graphFormatter(filteredWeightRecord);
          setWeight("");
          setDate(new Date());
          return;
        }
      }
      newWeightRecord = newWeightRecord.concat([
        {
          date: moment(date).format("YYYYMMDD"),
          weight: newWeight,
        },
      ]);
      setWeightRecord(newWeightRecord);
      graphFormatter(newWeightRecord);
      setWeight("");
      setDate(new Date());
    } catch (e) {
      console.log("catch");
    }
  }

  function removeWeightRecord(index) {
    if (user.loggedin === false) {
      return;
    }
    let newWeightRecord = weightRecord;
    let filteredWeightRecord = [];

    for (let i = 0; i < newWeightRecord.length; i++) {
      if (i !== index) {
        filteredWeightRecord = filteredWeightRecord.concat(newWeightRecord[i]);
      }
    }

    setWeightRecord(filteredWeightRecord);
    graphFormatter(filteredWeightRecord);
  }

  function sort(array) {
    return array.sort((a, b) => a.date - b.date);
  }

  return (
    <div className="mainContainer">
      <div className="headerContainer" id="header">
        <h1 className="header" id="title">
          WeightWeave
        </h1>
        <div className="loginContainer" id="loginBox">
          <button id="login" onClick={() => userLogin()}>
            Login
          </button>
        </div>
        <div className="hidden keyFileContainer" id="keyFileContainer">
          <label className="custom-file-upload" id="custom-file-upload">
            <input
              type="file"
              id="keyFile"
              accept=".json"
              onChange={keyFileCheck}
            />
            Upload Key
          </label>
        </div>
      </div>
      <div className="hidden mainArea" id="weightTrackerMain">
        <div className="inputArea">
          <div className="weightContainer">
            <h1 className="weightID">Enter Your Weight: </h1>
            <div className="textArea">
              <input
                className="weightInput"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>
          <div className="dateContainer">
            <h1 className="dateID">Enter The Date: </h1>
            <div className="dateInput">
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>
          <div>
            <button onClick={() => addWeightRecord()}>
              Add a Weight Record
            </button>
          </div>
          <div className="recordList">
            <ul className="historicRecordList">
              {sort(weightRecord).map((record, i) => {
                return (
                  <li key={i}>
                    <div className="historicRecord">
                      <div>{moment(record.date).format("LL")} </div>
                      <div>
                        {record.weight + "lbs"}{" "}
                        <button
                          className="remove"
                          onClick={() => removeWeightRecord(i)}
                        >
                          ╳
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <div className="graphArea">
          <div className="graph">
            <ResponsiveContainer width="100%" height={700}>
              <LineChart
                data={graphWeightRecord}
                margin={{ top: 30, right: 50, left: 10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  label={{ value: "Date", offset: -4, position: "bottom" }}
                />
                <YAxis
                  dataKey="weight"
                  type="number"
                  domain={["auto", "auto"]}
                  label={{
                    value: "Weight (lbs)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  padding={{ top: 20, bottom: 20 }}
                />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="buttonContainer">
            <button id="submitButton" onClick={() => submitData()}>
              Save Your Data
            </button>
            <button id="retrieveButton" onClick={() => retrieveData()}>
              Load Your Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
