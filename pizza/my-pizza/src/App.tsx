import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PizzaList from './Home/Pizza';
import PizzaAuth from './User/Authorization';
import PizzaRegist from './User/Registration';
import PizzaDetail from "./PizzaOne/Detail";
import Layout from './Layout/Layout';
import PizzaBasket from "./Basket/Basket";
import PizzaOrders from "./Orders/Orders";

const App: React.FC = () => {
  return (
    <Router basename="/Pizza2/">
      <Layout>
        <Routes>
          <Route path="/" element={<PizzaList />} />
          <Route path="/pizza/:id" element={<PizzaDetail />} />
          <Route path="/auth" element={<PizzaAuth />} />
          <Route path="/registr" element={<PizzaRegist />} />
          <Route path="/basket" element={<PizzaBasket />} />
          <Route path="/orders" element={<PizzaOrders />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;