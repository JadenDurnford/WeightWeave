import { useEffect, useState } from "react";
import DatePicker from "react-date-picker";
import moment from "moment";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
  const [user, setUser] = useState({
    loggedin: false,
    wallet: null,
    key: null,
    bal: 0,
  });
  const renderLineChart = (
    <LineChart
      width={730}
      height={250}
      data={weightRecord}
      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="weight" stroke="#8884d8" />
    </LineChart>
  );

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
        LoginSuccess();
      } else {
        alert("Please select an account with a balance greater than 0AR");
      }
    } catch (e) {
      alert("Please Select A Valid Key File");
      const keyFile = document.getElementById("keyFile");
      keyFile.value = "";
    }
  }

  function LoginSuccess() {
    let newUser = user;
    newUser.loggedin = true;
    setUser(newUser);
    const weightTracker = document.getElementById("weightTrackerMain");
    const loginButton = document.getElementById("login");
    const keyFileContainer = document.getElementById("keyFileContainer");

    weightTracker.classList.remove("hidden");
    loginButton.innerHTML = "Logout";
    keyFileContainer.classList.add("hidden");
  }

  function addWeightRecord() {
    let newRecord = weightRecord;
    var i;
    for (i = 0; i < newRecord.length; i++) {
      if (newRecord[i].date == moment(date).format("YYYYMMDD")) {
        return;
      }
    }
    newRecord.push({
      date: moment(date).format("YYYYMMDD"),
      weight: weight,
    });
    setWeightRecord(newRecord);
    setWeight(0);
    setDate(new Date());
  }

  async function submitFunc() {
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

    console.log(response.status);
  }

  async function retrieveData() {
    const txs = await ardb
      .search("transactions")
      .from(user.wallet)
      .tag("Weave-App", "weightweave")
      .findOne();
    arweave.transactions
      .getData(txs[0].node.id, { decode: true, string: true })
      .then((data) => {
        const newRecord = JSON.parse(data);
        setWeightRecord(newRecord);
      });
    await arweave.wallets.getBalance(user.wallet).then((balance) => {
      let newUser = user;
      newUser.bal = balance;
      setUser(newUser);
    });
    console.log(txs);
  }

  function removeWeightRecord(index) {
    let newWeightRecord = weightRecord;
    let filteredWeightRecord = [];

    for (let i = 0; i < newWeightRecord.length; i++) {
      if (i !== index) {
        filteredWeightRecord.push(newWeightRecord[i]);
      }
    }

    setWeightRecord(filteredWeightRecord);
  }

  function sort(array) {
    return array.sort((a, b) => a.date - b.date);
  }

  return (
    <div>
      <h1 className="login">Please Log In To Use WeightWeave</h1>
      <div className="loginButton">
        <button id="login" onClick={() => userLogin()}>
          Login
        </button>
      </div>
      <div className="hidden keyFileContainer" id="keyFileContainer">
        <input
          type="file"
          id="keyFile"
          accept=".json"
          onChange={keyFileCheck}
        />
      </div>
      <div className="hidden" id="weightTrackerMain">
        <button id="submitButton" onClick={() => submitFunc()}>
          Submit Your Data
        </button>
        <button id="retrieveButton" onClick={() => retrieveData()}>
          Retrieve Your Data
        </button>
        <p>{"your balance:" + user.bal}</p>
        <div>
          <h1>Enter Your Weight</h1>
          <div className="textArea">
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        </div>
        <div>
          <h1>Enter The Date</h1>
          <div className="textArea">
            <DatePicker value={date} onChange={setDate} />
          </div>
        </div>
        <div>
          <button onClick={addWeightRecord}>Add a Weight Record</button>
        </div>
        <div>
          <ul>
            {sort(weightRecord).map((record, i) => {
              return (
                <li key={i}>
                  <div>
                    {moment(record.date).format("YYYY/MM/DD")}: {record.weight}{" "}
                    <button onClick={() => removeWeightRecord(i)}>
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div>{renderLineChart}</div>
      </div>
    </div>
  );
}
