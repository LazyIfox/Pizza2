import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import styles from './orders.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { isSameDay, parseISO } from 'date-fns';
import { RootState } from '../store/types';


interface Order {
  id: number;
  creation_datetime: string;
  status: string;
  completion_datetime: string | null;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCreationDate, setSelectedCreationDate] = useState<Date | null>(null);
  const [selectedCompletionDate, setSelectedCompletionDate] = useState<Date | null>(null);
  const csrfToken = localStorage.getItem('csrfToken');
  const userLogin = useSelector((state: RootState) => state.user.userLogin);
  const isAuthenticated = !!userLogin;

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOrders = async () => {
      try {
        const response = await axios.get<Order[]>(
          'http://localhost:8000/api/orders/user_orders/',
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken || '',
            },
          }
        );
        setOrders(response.data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
  }, [csrfToken, isAuthenticated]);

  useEffect(() => {
    const filtered = orders.filter(order => {
      const statusMap: Record<string, string> = {
        'Черновик': 'DRAFT',
        'Удалён': 'DELETED',
        'Сформирован': 'FORMED',
        'Завершён': 'COMPLETED',
        'Отклонён': 'REJECTED',
      };

      const matchesStatus = selectedStatus
        ? order.status === statusMap[selectedStatus]
        : true;

      const matchesCreationDate = selectedCreationDate
        ? isSameDay(parseISO(order.creation_datetime), selectedCreationDate)
        : true;

      const matchesCompletionDate = selectedCompletionDate
        ? order.completion_datetime &&
          isSameDay(parseISO(order.completion_datetime), selectedCompletionDate)
        : true;

      return matchesStatus && matchesCreationDate && matchesCompletionDate;
    });

    setFilteredOrders(filtered);
  }, [selectedStatus, selectedCreationDate, selectedCompletionDate, orders]);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${hours}:${minutes} ${day}.${month}.${year}`;
  }

  function getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'DRAFT': 'Черновик',
      'DELETED': 'Удалён',
      'FORMED': 'Сформирован',
      'COMPLETED': 'Завершён',
      'REJECTED': 'Отклонён',
    };
    return statusMap[status] || status;
  }

  return (
    <div className={styles.main}>
      <h1 className={styles.title}>Заказы</h1>
      {!isAuthenticated ? (
        <p className={styles.emptyMessage}>
          Вы пока не авторизованы. Чтобы просматривать существующие заказы, войдите в аккаунт. Чтобы вернуться на главную страницу, нажмите на пиццу в левом верхнем углу. 
        </p>
      ) : (
        <>
      <div className={styles.filters}>
        <select
          className={styles.choice}
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">Статус заказа</option>
          <option value="Черновик">Черновик</option>
          <option value="Удалён">Удалён</option>
          <option value="Сформирован">Сформирован</option>
          <option value="Завершён">Завершён</option>
          <option value="Отклонён">Отклонён</option>
        </select>

      <div className={styles.dateWrapper}>
        <DatePicker
          selected={selectedCreationDate}
          onChange={(date) => setSelectedCreationDate(date)}
          placeholderText="Дата заказа"
          className={styles.choice}
          dateFormat="dd.MM.yyyy"
          isClearable
        />
      </div>
      <div className={styles.dateWrapper}>
        <DatePicker
          selected={selectedCompletionDate}
          onChange={(date) => setSelectedCompletionDate(date)}
          placeholderText="Дата завершения"
          className={styles.choice}
          dateFormat="dd.MM.yyyy"
          isClearable
        />
        </div>
      </div>
      {filteredOrders.length === 0 ? (
          <p className={styles.emptyMessage}>Нет подходящих заказов под ваши фильтры</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Номер заказа</th>
                <th>Дата заказа</th>
                <th>Статус заказа</th>
                <th>Дата завершения</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{formatDate(order.creation_datetime)}</td>
                  <td>{getStatusLabel(order.status)}</td>
                  <td>{order.completion_datetime ? formatDate(order.completion_datetime) : 'не завершён'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
      )}
    </div>
  );
};

export default Orders;