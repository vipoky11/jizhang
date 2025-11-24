import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout, Button, Space, DatePicker, message, Card, Select, ConfigProvider, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, AppstoreAddOutlined, AppstoreOutlined, WalletOutlined, BarChartOutlined, HomeOutlined, FileTextOutlined, ShopOutlined, LogoutOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/locale/zh_CN';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import QuickEntryForm from './components/QuickEntryForm';
import CategoryManager from './components/CategoryManager';
import AccountManager from './components/AccountManager';
import SupplierManager from './components/SupplierManager';
import LedgerStatisticsTable from './components/LedgerStatisticsTable';
import FinancialAnalysis from './components/FinancialAnalysis';
import MemoManager from './components/MemoManager';
import Login from './components/Login';
import { transactionAPI } from './api/transactions';
import { categoryAPI } from './api/categories';
import { supplierAPI } from './api/suppliers';
import { isAuthenticated, clearToken, getStoredToken, authAPI } from './api/auth';
import './App.css';

dayjs.locale('zh-cn');

const { Header, Content } = Layout;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [batchFormVisible, setBatchFormVisible] = useState(false);
  const [categoryManagerVisible, setCategoryManagerVisible] = useState(false);
  const [accountManagerVisible, setAccountManagerVisible] = useState(false);
  const [supplierManagerVisible, setSupplierManagerVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [year, setYear] = useState(dayjs().year());
  const [prevYear, setPrevYear] = useState(dayjs().year()); // 记录上一次的年份，用于判断是否切换了年份
  const [categoryRefreshKey, setCategoryRefreshKey] = useState(0);
  const [accountRefreshKey] = useState(0);
  const [supplierRefreshKey] = useState(0);
  const [ledgerRefreshKey, setLedgerRefreshKey] = useState(0);
  const [filterMonth, setFilterMonth] = useState(dayjs().month() + 1); // 筛选月份，1-12，默认当前月份
  const [filterYear, setFilterYear] = useState(dayjs().year()); // 筛选年份，默认当前年份
  const [filterType, setFilterType] = useState(null); // 筛选类型，null表示全部
  const [filterCategory, setFilterCategory] = useState(null); // 筛选分类，null表示全部
  const [filterSupplier, setFilterSupplier] = useState(null); // 筛选供应商，null表示全部
  const [categories, setCategories] = useState([]); // 所有分类列表
  const [suppliers, setSuppliers] = useState([]); // 所有供应商列表
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'analysis', 'memos'

  // 加载交易记录
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
      const response = await transactionAPI.getAll(params);
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error) {
      message.error('加载交易记录失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [year]);

  // 加载统计信息
  const loadStats = useCallback(async () => {
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      await transactionAPI.getStats(startDate, endDate);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  }, [year]);

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        setIsLoggedIn(true);
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // 登录成功回调
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // 退出登录
  const handleLogout = async () => {
    try {
      const token = getStoredToken();
      if (token) {
        // 调用后端登出接口（可选）
        await authAPI.logout(token).catch(() => {
          // 即使后端登出失败也继续清除本地 token
        });
      }
      // 清除本地 token
      clearToken();
      setIsLoggedIn(false);
      message.success('已退出登录');
    } catch (error) {
      console.error('退出登录错误:', error);
      // 即使出错也清除本地 token
      clearToken();
      setIsLoggedIn(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadTransactions();
      loadStats();
      // 更新筛选年份
      setFilterYear(year);
      
      // 只有在切换年份时才清空月份，首次加载保持当前月份
      if (prevYear !== year) {
        setFilterMonth(null); // 切换年份时，月份默认全部（清空）
        setPrevYear(year); // 更新记录的年份
      }
      
      setFilterType(null);
      setFilterCategory(null);
      setFilterSupplier(null);
    }
  }, [year, loadStats, prevYear, isLoggedIn, loadTransactions]);

  // 加载分类列表（用于筛选）
  useEffect(() => {
    const loadCategories = async () => {
      try {
        // 加载收入和支出分类
        const [incomeRes, expenseRes] = await Promise.all([
          categoryAPI.getAll('income'),
          categoryAPI.getAll('expense')
        ]);
        const allCategories = [
          ...(incomeRes.data.success ? incomeRes.data.data : []),
          ...(expenseRes.data.success ? expenseRes.data.data : [])
        ];
        // 去重
        const uniqueCategories = Array.from(
          new Map(allCategories.map(cat => [cat.name, cat])).values()
        );
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('加载分类失败:', error);
      }
    };
    loadCategories();
  }, [categoryRefreshKey]);

  // 加载供应商列表（用于筛选）
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await supplierAPI.getAll();
        if (response.data.success) {
          setSuppliers(response.data.data);
        }
      } catch (error) {
        console.error('加载供应商失败:', error);
      }
    };
    loadSuppliers();
  }, [supplierRefreshKey]);

  // 筛选后的交易记录
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // 按年份筛选（必须）
    if (filterYear) {
      filtered = filtered.filter(t => {
        const transactionDate = dayjs(t.date);
        return transactionDate.year() === filterYear;
      });
    }
    
    // 按月份筛选（可选）
    if (filterMonth) {
      filtered = filtered.filter(t => {
        const transactionDate = dayjs(t.date);
        return transactionDate.month() + 1 === filterMonth;
      });
    }
    
    // 按类型筛选
    if (filterType) {
      filtered = filtered.filter(t => t.type === filterType);
    }
    
    // 按分类筛选
    if (filterCategory) {
      filtered = filtered.filter(t => t.category === filterCategory);
    }
    
    // 按供应商筛选
    if (filterSupplier) {
      filtered = filtered.filter(t => t.supplier === filterSupplier);
    }
    
    return filtered;
  }, [transactions, filterYear, filterMonth, filterType, filterCategory, filterSupplier]);

  // 处理新增/编辑提交
  const handleSubmit = async (data) => {
    try {
      if (editingRecord) {
        await transactionAPI.update(editingRecord.id, data);
        message.success('更新成功');
      } else {
        await transactionAPI.create(data);
        message.success('添加成功');
      }
      setFormVisible(false);
      setEditingRecord(null);
      loadTransactions();
      loadStats();
      setLedgerRefreshKey(prev => prev + 1);
    } catch (error) {
      message.error(editingRecord ? '更新失败' : '添加失败');
      console.error(error);
    }
  };

  // 处理批量提交
  const handleBatchSubmit = async (batchData) => {
    try {
      const validData = batchData
        .filter(item => item.amount > 0)
        .map(item => ({
          type: item.type,
          amount: item.amount,
          description: item.description || '',
          date: item.date,
          category: item.category || '',
          account: item.account || '现金',
        }));

      if (validData.length === 0) {
        message.warning('请至少添加一条有效记录');
        return;
      }

      await transactionAPI.createBatch(validData);
      message.success(`成功添加 ${validData.length} 条记录`);
      setBatchFormVisible(false);
      loadTransactions();
      loadStats();
      setLedgerRefreshKey(prev => prev + 1);
    } catch (error) {
      message.error('批量添加失败');
      console.error(error);
    }
  };

  // 处理删除
  const handleDelete = async (id) => {
    try {
      await transactionAPI.delete(id);
      loadTransactions();
      loadStats();
      setLedgerRefreshKey(prev => prev + 1);
    } catch (error) {
      throw error;
    }
  };

  // 处理编辑
  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormVisible(true);
  };

  // 如果正在检查登录状态，显示加载中
  if (checkingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        加载中...
      </div>
    );
  }

  // 如果未登录，显示登录页面
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <ConfigProvider locale={locale}>
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative'
      }}>
        {/* 左侧：标题和年份选择 */}
        <Space>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
            记账系统
          </h1>
          <span style={{ marginLeft: 24, color: '#666' }}>选择年份：</span>
          <DatePicker
            picker="year"
            value={dayjs(`${year}-01-01`)}
            onChange={(date) => setYear(date ? date.year() : dayjs().year())}
            format="YYYY"
            locale={locale}
          />
        </Space>
        
        {/* 中间：导航按钮（居中） */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Space>
            <Button
              type={currentPage === 'home' ? 'primary' : 'default'}
              icon={<HomeOutlined />}
              onClick={() => setCurrentPage('home')}
            >
              记账管理
            </Button>
            <Button
              type={currentPage === 'analysis' ? 'primary' : 'default'}
              icon={<BarChartOutlined />}
              onClick={() => setCurrentPage('analysis')}
            >
              财务分析
            </Button>
            <Button
              type={currentPage === 'memos' ? 'primary' : 'default'}
              icon={<FileTextOutlined />}
              onClick={() => setCurrentPage('memos')}
            >
              备忘录
            </Button>
          </Space>
        </div>
        
        {/* 右侧：退出登录 */}
        <div style={{ marginLeft: 'auto' }}>
          <Popconfirm
            title="确定要退出登录吗？"
            description="退出后需要重新输入密码才能登录"
            onConfirm={handleLogout}
            okText="确定"
            cancelText="取消"
            placement="bottomRight"
          >
            <Tooltip title="退出登录" placement="bottom">
              <Button
                icon={<LogoutOutlined />}
                danger
                type="text"
                style={{ fontSize: '18px' }}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      </Header>
      <Content style={{ padding: currentPage === 'analysis' ? '0' : '24px', background: '#f0f2f5' }}>
        {currentPage === 'analysis' ? (
          <FinancialAnalysis year={year} />
        ) : currentPage === 'memos' ? (
          <MemoManager year={year} />
        ) : (
          <>
            <LedgerStatisticsTable year={year} refreshKey={ledgerRefreshKey} />
        
        <QuickEntryForm 
          key={`quick-entry-${categoryRefreshKey}-${accountRefreshKey}-${supplierRefreshKey}`}
          onSubmit={async (data) => {
            try {
              await transactionAPI.create(data);
              message.success('添加成功');
              loadTransactions();
              loadStats();
              setLedgerRefreshKey(prev => prev + 1);
            } catch (error) {
              let errorMessage = '添加失败';
              if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
                errorMessage = '无法连接到后端服务器，请确保后端服务已启动 (http://localhost:5001)';
              } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = `添加失败: ${error.message}`;
              }
              message.error(errorMessage);
              console.error('添加失败详情:', error);
              throw error;
            }
          }}
          onBatchSubmit={async (batchData) => {
            try {
              const validData = batchData
                .filter(item => item.amount > 0)
                .map(item => ({
                  type: item.type,
                  amount: item.amount,
                  description: item.description || '',
                  date: item.date,
                  category: item.category,
                  account: item.account || '现金',
                  supplier: item.supplier,
                }));
              
              if (validData.length === 0) {
                message.warning('没有有效的记录可以提交');
                return;
              }
              
              await transactionAPI.createBatch(validData);
              message.success(`成功添加 ${validData.length} 条记录`);
              loadTransactions();
              loadStats();
              setLedgerRefreshKey(prev => prev + 1);
            } catch (error) {
              let errorMessage = '批量添加失败';
              if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
                errorMessage = '无法连接到后端服务器，请确保后端服务已启动 (http://localhost:5001)';
              } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = `批量添加失败: ${error.message}`;
              }
              message.error(errorMessage);
              console.error('批量添加失败详情:', error);
              throw error;
            }
          }}
          loading={loading}
          categoryRefreshKey={categoryRefreshKey}
          accountRefreshKey={accountRefreshKey}
          supplierRefreshKey={supplierRefreshKey}
        />
        
        <Card
          title="交易记录"
          extra={
            <Space>
              <Button
                icon={<WalletOutlined />}
                onClick={() => setAccountManagerVisible(true)}
              >
                账户管理
              </Button>
              <Button
                icon={<AppstoreOutlined />}
                onClick={() => setCategoryManagerVisible(true)}
              >
                分类管理
              </Button>
              <Button
                icon={<ShopOutlined />}
                onClick={() => setSupplierManagerVisible(true)}
              >
                供应商管理
              </Button>
              <Button
                type="primary"
                icon={<AppstoreAddOutlined />}
                onClick={() => setBatchFormVisible(true)}
              >
                批量录入
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRecord(null);
                  setFormVisible(true);
                }}
              >
                详细录入
              </Button>
            </Space>
          }
        >
          <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Space wrap>
              <span>筛选年份：</span>
              <Select
                style={{ width: 120 }}
                placeholder="请选择年份"
                value={filterYear}
                onChange={(value) => {
                  // 切换年份时，清空月份
                  if (value !== filterYear) {
                    setFilterMonth(null);
                  }
                  setFilterYear(value);
                }}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const yearValue = dayjs().year() - 5 + i;
                  return (
                    <Select.Option key={yearValue} value={yearValue}>
                      {yearValue}年
                    </Select.Option>
                  );
                })}
              </Select>
              <span style={{ marginLeft: 16 }}>筛选月份：</span>
              <Select
                style={{ width: 120 }}
                placeholder="请选择月份"
                value={filterMonth || undefined}
                onChange={setFilterMonth}
                allowClear
              >
                <Select.Option value={1}>1月</Select.Option>
                <Select.Option value={2}>2月</Select.Option>
                <Select.Option value={3}>3月</Select.Option>
                <Select.Option value={4}>4月</Select.Option>
                <Select.Option value={5}>5月</Select.Option>
                <Select.Option value={6}>6月</Select.Option>
                <Select.Option value={7}>7月</Select.Option>
                <Select.Option value={8}>8月</Select.Option>
                <Select.Option value={9}>9月</Select.Option>
                <Select.Option value={10}>10月</Select.Option>
                <Select.Option value={11}>11月</Select.Option>
                <Select.Option value={12}>12月</Select.Option>
              </Select>
              <span style={{ marginLeft: 16 }}>筛选支付：</span>
              <Select
                style={{ width: 120 }}
                placeholder="全部支付"
                allowClear
                value={filterType}
                onChange={setFilterType}
              >
                <Select.Option value="income">收入</Select.Option>
                <Select.Option value="expense">支出</Select.Option>
              </Select>
              <span style={{ marginLeft: 16 }}>筛选分类：</span>
              <Select
                style={{ width: 150 }}
                placeholder="全部分类"
                allowClear
                value={filterCategory}
                onChange={setFilterCategory}
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {categories.map(cat => (
                  <Select.Option key={cat.id} value={cat.name}>
                    {cat.name}
                  </Select.Option>
                ))}
              </Select>
              <span style={{ marginLeft: 16 }}>筛选供应商：</span>
              <Select
                style={{ width: 150 }}
                placeholder="全部供应商"
                allowClear
                value={filterSupplier}
                onChange={setFilterSupplier}
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {suppliers.map(supplier => (
                  <Select.Option key={supplier.id} value={supplier.name}>
                    {supplier.name}
                  </Select.Option>
                ))}
              </Select>
            </Space>
            <span style={{ color: '#666' }}>
              显示 {filteredTransactions.length} / {transactions.length} 条记录
            </span>
          </Space>
          <TransactionList
            transactions={filteredTransactions}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={loadTransactions}
          />
        </Card>

        <TransactionForm
          visible={formVisible}
          onCancel={() => {
            setFormVisible(false);
            setEditingRecord(null);
          }}
          onSubmit={handleSubmit}
          initialValues={editingRecord}
          isBatch={false}
          categoryRefreshKey={categoryRefreshKey}
          accountRefreshKey={accountRefreshKey}
          supplierRefreshKey={supplierRefreshKey}
        />

        <TransactionForm
          visible={batchFormVisible}
          onCancel={() => setBatchFormVisible(false)}
          onSubmit={handleBatchSubmit}
          isBatch={true}
          categoryRefreshKey={categoryRefreshKey}
          accountRefreshKey={accountRefreshKey}
          supplierRefreshKey={supplierRefreshKey}
        />

        <CategoryManager
          visible={categoryManagerVisible}
          onCancel={() => setCategoryManagerVisible(false)}
          onRefresh={() => {
            setCategoryRefreshKey(prev => prev + 1);
          }}
        />

        <AccountManager
          visible={accountManagerVisible}
          onCancel={() => setAccountManagerVisible(false)}
          onRefresh={() => {
            setCategoryRefreshKey(prev => prev + 1);
          }}
        />
        <SupplierManager
          visible={supplierManagerVisible}
          onCancel={() => setSupplierManagerVisible(false)}
          onRefresh={() => {
            setCategoryRefreshKey(prev => prev + 1);
            loadTransactions();
          }}
        />
          </>
        )}
        </Content>
    </Layout>
    </ConfigProvider>
  );
}

export default App;
