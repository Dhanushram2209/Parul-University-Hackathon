import React, { useState, useEffect } from 'react';
import { 
  Layout, Menu, Typography, Card, Row, Col, Table, Statistic, 
  Badge, Tabs, Avatar, List, Tag, Divider, Collapse, Spin 
} from 'antd';
import { 
  UserOutlined, TeamOutlined, MedicineBoxOutlined, DashboardOutlined, 
  ClockCircleOutlined, CalendarOutlined, BellOutlined, FileTextOutlined,
  SafetyCertificateOutlined, PhoneOutlined, HomeOutlined
} from '@ant-design/icons';
import Header from '../../../components/Header';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import './DoctorDashboard.css';

const { Header: AntHeader, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfileData();
    }
  }, [activeTab]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/profile');
      setProfileData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <>
      <Row gutter={[16, 16]} className="dashboard-stats">
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card" hoverable>
            <Statistic title="Total Patients" value={24} />
            <Text type="secondary">5 new this week</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card" hoverable>
            <Statistic title="Critical Alerts" value={3} />
            <Text type="secondary">Require immediate attention</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card" hoverable>
            <Statistic title="Pending Actions" value={5} />
            <Text type="secondary">Prescriptions to review</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-sections">
        <Col xs={24}>
          <Card 
            title="Patient Monitoring" 
            className="dashboard-section-card" 
            hoverable
            extra={<a>View All</a>}
          >
            <Table 
              columns={columns} 
              dataSource={data} 
              size="middle" 
              pagination={false}
              className="patient-table"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-sections">
        <Col xs={24} md={12}>
          <Card title="Recent Alerts" className="dashboard-section-card" hoverable>
            <div className="alerts-placeholder">
              <Text type="secondary">No new alerts</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Upcoming Appointments" className="dashboard-section-card" hoverable>
            <div className="appointments-placeholder">
              <Text type="secondary">No upcoming appointments</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderProfile = () => (
    <Card title="Your Profile" className="dashboard-section-card" hoverable>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <Spin />
        </div>
      ) : profileData ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Avatar size={100} icon={<UserOutlined />} />
                <Title level={4} style={{ marginTop: '16px' }}>
                  {profileData.firstName} {profileData.lastName}
                </Title>
                <Tag color="blue" style={{ marginBottom: '16px' }}>
                  {profileData.role}
                </Tag>
              </div>
              
              <List size="small">
                <List.Item>
                  <List.Item.Meta
                    title="Email"
                    description={profileData.email}
                  />
                </List.Item>
                <List.Item>
                  <List.Item.Meta
                    title="Phone"
                    description={profileData.phoneNumber || 'Not provided'}
                  />
                </List.Item>
              </List>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card title="Professional Information">
              <Collapse defaultActiveKey={['1']}>
                <Panel header="Basic Information" key="1">
                  <Row gutter={16}>
                    <Col span={12}>
                      <List.Item>
                        <List.Item.Meta
                          avatar={<SafetyCertificateOutlined />}
                          title="Specialization"
                          description={profileData.specialization || 'Not specified'}
                        />
                      </List.Item>
                    </Col>
                    <Col span={12}>
                      <List.Item>
                        <List.Item.Meta
                          avatar={<FileTextOutlined />}
                          title="License Number"
                          description={profileData.licenseNumber || 'Not provided'}
                        />
                      </List.Item>
                    </Col>
                  </Row>
                </Panel>
                <Panel header="Contact Information" key="2">
                  <Row gutter={16}>
                    <Col span={12}>
                      <List.Item>
                        <List.Item.Meta
                          avatar={<PhoneOutlined />}
                          title="Phone Number"
                          description={profileData.phoneNumber || 'Not provided'}
                        />
                      </List.Item>
                    </Col>
                    <Col span={12}>
                      <List.Item>
                        <List.Item.Meta
                          avatar={<HomeOutlined />}
                          title="Hospital Affiliation"
                          description={profileData.hospitalAffiliation || 'Not specified'}
                        />
                      </List.Item>
                    </Col>
                  </Row>
                </Panel>
              </Collapse>
            </Card>
          </Col>
        </Row>
      ) : (
        <Text type="secondary">No profile data available</Text>
      )}
    </Card>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'profile':
        return renderProfile();
      default:
        return renderDashboard();
    }
  };

  return (
    <Layout className="doctor-dashboard">
      <Sider width={250} className="dashboard-sider">
        <div className="dashboard-logo">
          <Title level={4} className="dashboard-title">
            <DashboardOutlined /> Doctor Portal
          </Title>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={({ key }) => setActiveTab(key)}
          className="dashboard-menu"
        >
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>Dashboard</Menu.Item>
          <Menu.Item key="patients" icon={<TeamOutlined />}>Patients</Menu.Item>
          <Menu.Item key="prescriptions" icon={<MedicineBoxOutlined />}>Prescriptions</Menu.Item>
          <Menu.Item key="profile" icon={<UserOutlined />}>Profile</Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <AntHeader className="dashboard-header">
          <Header />
        </AntHeader>
        <Content className="dashboard-content">
          <div className="dashboard-container">
            <Title level={3} className="dashboard-page-title">
              {activeTab === 'dashboard' ? 'Doctor Dashboard' : 
               activeTab === 'profile' ? 'Your Profile' : ''}
            </Title>
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

// Table columns and data (same as your original)
const columns = [
  {
    title: 'Patient',
    dataIndex: 'patient',
    key: 'patient',
    render: (text) => <Text strong>{text}</Text>,
  },
  {
    title: 'Last Reading',
    dataIndex: 'reading',
    key: 'reading',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status) => (
      <Badge 
        status={status === 'Critical' ? 'error' : status === 'Warning' ? 'warning' : 'success'} 
        text={status}
      />
    ),
  },
  {
    title: 'Last Checked',
    dataIndex: 'lastChecked',
    key: 'lastChecked',
    render: (text) => (
      <div className="last-checked">
        <ClockCircleOutlined style={{ marginRight: 8 }} />
        {text}
      </div>
    ),
  },
];

const data = [
  {
    key: '1',
    patient: 'John Smith',
    reading: 'BP: 120/80, Glucose: 98',
    status: 'Normal',
    lastChecked: '2 hours ago',
  },
  {
    key: '2',
    patient: 'Sarah Johnson',
    reading: 'BP: 140/90, Glucose: 110',
    status: 'Warning',
    lastChecked: '30 minutes ago',
  },
  {
    key: '3',
    patient: 'Michael Brown',
    reading: 'BP: 160/100, Glucose: 130',
    status: 'Critical',
    lastChecked: '10 minutes ago',
  },
  {
    key: '4',
    patient: 'Emily Davis',
    reading: 'BP: 118/78, Glucose: 95',
    status: 'Normal',
    lastChecked: '1 day ago',
  },
];

export default DoctorDashboard;