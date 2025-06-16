import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './pizza.module.css';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../store/types';
import { useSelector } from 'react-redux';

interface Pizza {
  id: number;
  name: string;
  price: number;
  description: string;
  cook: string;
  image: string;
}

interface ApiResponse {
  pizzas: Pizza[];
  draft_order_id: number;
}

const Pizza: React.FC = () => {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [filteredPizzas, setFilteredPizzas] = useState<Pizza[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('');
  const [vegetarianFilter, setVegetarianFilter] = useState<string>('');
  const navigate = useNavigate();
  const isCook = useSelector((state: RootState) => state.user.is_cook);

  useEffect(() => {
    const fetchPizzas = async () => {
      try {
        const response = await axios.get<ApiResponse>('http://localhost:8000/api/pizzas/', { withCredentials: true });
        setPizzas(response.data.pizzas); 
        setFilteredPizzas(response.data.pizzas);
      } catch (error) {
        console.error('Error fetching pizzas:', error);
      }
    };
    fetchPizzas();
  }, [isCook]);
  
  const handleSearch = async (query: string) => {
    try {
      const response = await axios.get<ApiResponse>(`http://localhost:8000/api/pizzas/?search=${query}`,{ withCredentials: true });
      setFilteredPizzas(response.data.pizzas);
    } catch (error) {
      console.error('Error searching pizzas:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query) {
      handleSearch(query);
    } else {
      setFilteredPizzas(pizzas);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      handleSearch(searchQuery);
    } else {
      setFilteredPizzas(pizzas);
    }
  };

  const handleSortChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value;
    setSortOrder(sort);
    try {
      const queryParams = new URLSearchParams();
      if (vegetarianFilter) queryParams.append('is_vegetarian', vegetarianFilter);
      if (sort) queryParams.append('ordering', sort);
      const url = `http://localhost:8000/api/pizzas/?${queryParams.toString()}`;
      const response = await axios.get<ApiResponse>(url);
      setFilteredPizzas(response.data.pizzas);
    } catch (error) {
      console.error('Error fetching pizzas:', error);
    }
  };

  const handleVegetarianFilterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const veg = e.target.value;
    setVegetarianFilter(veg);
    try {
      const queryParams = new URLSearchParams();
      if (veg) queryParams.append('is_vegetarian', veg);
      if (sortOrder) queryParams.append('ordering', sortOrder);
      const url = `http://localhost:8000/api/pizzas/?${queryParams.toString()}`;
      const response = await axios.get<ApiResponse>(url);
      setFilteredPizzas(response.data.pizzas);
    } catch (error) {
      console.error('Error filtering pizzas:', error);
    }
  };

  const handlePizzaClick = (pizzaId: number) => {
    navigate(`/pizza/${pizzaId}`);
  };

  return (
    <div className={styles.main}>
      <form className={styles.form} action="" method="get" onSubmit={handleSubmit}>
        <input name="text" className={styles.input} placeholder="Поиск" type="text"
                value={searchQuery} onChange={handleInputChange}/>
        {!isCook && (
          <div className={styles.filters}>
            <select value={sortOrder} onChange={handleSortChange} className={styles.select}>
              <option value="">Цена без фильтра</option>
              <option value="price">По возрастанию цены</option>
              <option value="-price">По убыванию цены</option>
            </select>
            <select value={vegetarianFilter} onChange={handleVegetarianFilterChange} className={styles.select}>
              <option value="">Все пиццы</option>
              <option value="true">Вегетарианские</option>
              <option value="false">Не вегетарианские</option>
            </select>
          </div>
        )}
      </form>
      <div className={styles.heading_location}>
        <h2 className={styles.heading}>{isCook ? 'Информация о пиццах, которые находятся под вашей ответственностью' : 'Пицца'}</h2>
      </div>
      <div className={styles.all_pizzas}>
        {filteredPizzas && filteredPizzas.length > 0 ? (
          filteredPizzas.map((pizza) => (
            <div className={styles.card} key={pizza.id}>
              <div className={styles.info}>
                <div className={styles.picture}>
                  <img src={pizza.image} alt={pizza.name} className={styles.image} />
                </div>
                <div className={styles.info}>
                  <p className={styles.name}>{pizza.name}</p>
                  <p className={styles.descript}>{pizza.description}</p>
                </div>
              </div>
              <div className={styles.button}>
                <button onClick={() => handlePizzaClick(pizza.id)} className={styles.button_price}>
                  От {pizza.price} руб.
                </button>
              </div>
            </div>
            ))
          ) : (
            <p>Нет подходящих пицц под данные фильтры</p>
          )}
        </div>
    </div>
  );
};

export default Pizza;