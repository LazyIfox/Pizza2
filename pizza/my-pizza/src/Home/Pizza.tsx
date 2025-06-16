import React, { useState } from 'react';
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

// Мок-данные
const mockPizzas: Pizza[] = [
  {
    id: 1,
    name: 'Маргарита',
    price: 300,
    description: 'Классическая пицца с томатным соусом, моцареллой и базиликом.',
    cook: 'Cook A',
    image: 'https://example.com/margherita.jpg', // Ссылка на изображение
  },
  {
    id: 2,
    name: 'Пепперони',
    price: 400,
    description: 'Пицца с пикантной колбасой пепперони и моцареллой.',
    cook: 'Cook B',
    image: 'https://example.com/pepperoni.jpg', // Ссылка на изображение
  },
  {
    id: 3,
    name: 'Гавайская',
    price: 450,
    description: 'Пицца с ананасами, ветчиной и моцареллой.',
    cook: 'Cook C',
    image: 'https://example.com/hawaiian.jpg', // Ссылка на изображение
  },
  // Добавьте другие мок-данные по необходимости
];

const Pizza: React.FC = () => {
  const [filteredPizzas, setFilteredPizzas] = useState<Pizza[]>(mockPizzas); // Мок-данные всегда
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('');
  const [vegetarianFilter, setVegetarianFilter] = useState<string>('');
  const navigate = useNavigate();
  const isCook = useSelector((state: RootState) => state.user.is_cook);

  // Фильтрация пицц
  const handleSearch = (query: string) => {
    const filtered = mockPizzas.filter((pizza) =>
      pizza.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredPizzas(filtered);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sort = e.target.value;
    setSortOrder(sort);
    const sortedPizzas = [...filteredPizzas];
    if (sort === 'price') {
      sortedPizzas.sort((a, b) => a.price - b.price);
    } else if (sort === '-price') {
      sortedPizzas.sort((a, b) => b.price - a.price);
    }
    setFilteredPizzas(sortedPizzas);
  };

  const handleVegetarianFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const veg = e.target.value;
    setVegetarianFilter(veg);
    // Примерная фильтрация для вегетарианских пицц
    const filtered = mockPizzas.filter((pizza) => {
      if (veg === '') return true; // Показывать все
      // Пример: вегетарианские пиццы, если это вегетарианская пицца
      if (veg === 'true' && pizza.description.includes('вегетариан')) {
        return true;
      }
      return false;
    });
    setFilteredPizzas(filtered);
  };

  const handlePizzaClick = (pizzaId: number) => {
    navigate(`/pizza/${pizzaId}`);
  };

  return (
    <div className={styles.main}>
      <form className={styles.form} action="" method="get">
        <input
          name="text"
          className={styles.input}
          placeholder="Поиск"
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
        />
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
        <h2 className={styles.heading}>
          {isCook ? 'Информация о пиццах, которые находятся под вашей ответственностью' : 'Пицца'}
        </h2>
      </div>
      <div className={styles.all_pizzas}>
        {filteredPizzas.length > 0 ? (
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