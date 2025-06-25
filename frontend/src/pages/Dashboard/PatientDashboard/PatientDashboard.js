import React, { useState, useEffect } from 'react';
import { 
  Layout, Menu, Typography, Card, Row, Col, Statistic, Progress, Alert, 
  Table, Button, Modal, Form, Input, Select, DatePicker, Badge, message, 
  Spin, Tabs, Avatar, List, Tag, Divider, Collapse, Space, Popconfirm, Tooltip
} from 'antd';
import { 
  UserOutlined, HeartOutlined, MedicineBoxOutlined, BellOutlined, 
  DashboardOutlined, PlusOutlined, LineChartOutlined, VideoCameraOutlined,
  TrophyOutlined, FireOutlined, CheckOutlined, CloseOutlined, 
  CalendarOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  FileTextOutlined, SyncOutlined, CheckCircleOutlined, TeamOutlined,
  ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import './PatientDashboard.css';
import api from '../../../services/api';
import HealthTrendsChart from './components/HealthTrendsChart';
import RewardsProgram from './components/RewardsProgram';
import moment from 'moment';


const { Header: AntHeader, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Panel } = Collapse;

const PatientDashboard = () => {
  const [healthData, setHealthData] = useState([]);
  const [medications, setMedications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [riskScore, setRiskScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTelemedModalVisible, setIsTelemedModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [telemedForm] = Form.useForm();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [trendsData, setTrendsData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatientData();
    fetchDoctors();
    fetchProfileData();
    
    const interval = setInterval(fetchPatientData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      const [
        healthResponse, 
        medsResponse, 
        alertsResponse, 
        appointmentsResponse, 
        riskResponse, 
        pointsResponse, 
        vitalsResponse,
        trendsResponse
      ] = await Promise.all([
        api.get('/patient/health-data'),
        api.get('/patient/medications'),
        api.get('/patient/alerts'),
        api.get('/patient/appointments'),
        api.get('/patient/risk-score'),
        api.get('/patient/points'),
        api.get('/patient/vitals'),
        api.get('/patient/health-data?limit=30') // For trends chart
      ]);

      setHealthData(healthResponse.data);
      setMedications(medsResponse.data);
      setAlerts(alertsResponse.data);
      setAppointments(appointmentsResponse.data);
      setRiskScore(riskResponse.data.score);
      setPoints(pointsResponse.data.points);
      setTrendsData(trendsResponse.data);
      
      // Count unread alerts
      const unread = alertsResponse.data.filter(a => !a.isRead).length;
      setUnreadAlerts(unread);
      
      if (vitalsResponse.data) {
        setVitals(vitalsResponse.data);
      } else if (healthResponse.data.length > 0) {
        const latest = healthResponse.data[0];
        setVitals({
          bloodPressure: latest.bloodPressure,
          heartRate: latest.heartRate,
          bloodSugar: latest.bloodSugar,
          oxygenLevel: latest.oxygenLevel
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchProfileData = async () => {
    try {
      const response = await api.get('/patient/profile');
      setProfileData(response.data);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  const handleAddHealthData = async (values) => {
    try {
      await api.post('/patient/health-data', values);
      message.success('Health data added successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchPatientData();
    } catch (error) {
      console.error('Error adding health data:', error);
      message.error('Failed to add health data');
    }
  };

  const handleRequestTelemed = async (values) => {
    try {
      await api.post('/telemedicine/request', {
        ...values,
        doctorId: selectedDoctor
      });
      message.success('Telemedicine request submitted');
      setIsTelemedModalVisible(false);
      telemedForm.resetFields();
      fetchPatientData();
    } catch (error) {
      console.error('Error requesting telemedicine:', error);
      message.error('Failed to submit telemedicine request');
    }
  };

  const handleMarkMedicationTaken = async (medicationId) => {
    try {
      await api.post(`/patient/medications/${medicationId}/taken`);
      message.success('Medication marked as taken');
      fetchPatientData();
    } catch (error) {
      console.error('Error marking medication:', error);
      message.error('Failed to mark medication');
    }
  };

  const handleMarkAlertRead = async (alertId) => {
    try {
      await api.post(`/patient/alerts/${alertId}/read`);
      message.success('Alert marked as read');
      fetchPatientData();
    } catch (error) {
      console.error('Error marking alert:', error);
      message.error('Failed to mark alert');
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const healthDataColumns = [
    {
      title: 'Date',
      dataIndex: 'recordedAt',
      key: 'date',
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt)
    },
    {
      title: 'Blood Pressure',
      dataIndex: 'bloodPressure',
      key: 'bloodPressure',
      render: (text) => {
        const [systolic, diastolic] = text.split('/').map(Number);
        let color = 'default';
        if (systolic > 140 || diastolic > 90) color = 'error';
        else if (systolic > 130 || diastolic > 85) color = 'warning';
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Heart Rate',
      dataIndex: 'heartRate',
      key: 'heartRate',
      render: (text) => {
        let color = 'default';
        if (text > 100 || text < 60) color = 'error';
        else if (text > 90 || text < 65) color = 'warning';
        return <Tag color={color}>{text} bpm</Tag>;
      }
    },
    {
      title: 'Blood Sugar',
      dataIndex: 'bloodSugar',
      key: 'bloodSugar',
      render: (text) => {
        let color = 'default';
        if (text > 140) color = 'error';
        else if (text > 120) color = 'warning';
        return <Tag color={color}>{text} mg/dL</Tag>;
      }
    },
    {
      title: 'Oxygen Level',
      dataIndex: 'oxygenLevel',
      key: 'oxygenLevel',
      render: (text) => {
        let color = 'default';
        if (text < 92) color = 'error';
        else if (text < 95) color = 'warning';
        return <Tag color={color}>{text}%</Tag>;
      }
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (text) => text || '--'
    }
  ];

  const medicationColumns = [
    {
      title: 'Medication',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Dosage',
      dataIndex: 'dosage',
      key: 'dosage'
    },
    {
      title: 'Frequency',
      dataIndex: 'frequency',
      key: 'frequency'
    },
    {
      title: 'Next Dose',
      dataIndex: 'nextDose',
      key: 'nextDose',
      render: (text, record) => (
        <div>
          <div>{new Date(text).toLocaleDateString()}</div>
          <Text type="secondary">{new Date(text).toLocaleTimeString()}</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text, record) => (
        text === 'Taken' ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Taken
          </Tag>
        ) : (
          <Space>
            <Tag icon={<SyncOutlined spin />} color="processing">
              Pending
            </Tag>
            <Popconfirm
              title="Mark this medication as taken?"
              onConfirm={() => handleMarkMedicationTaken(record.medicationID)}
              okText="Yes"
              cancelText="No"
            >
              <Button size="small" icon={<CheckOutlined />}>Mark Taken</Button>
            </Popconfirm>
          </Space>
        )
      )
    }
  ];

  const alertColumns = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text) => new Date(text).toLocaleString(),
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          {record.reason && (
            <Text type="secondary">{record.reason}</Text>
          )}
        </div>
      )
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (text) => (
        <Badge 
          status={text === 'High' ? 'error' : text === 'Medium' ? 'warning' : 'processing'} 
          text={text} 
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        record.isRead ? (
          <Tag color="default">Read</Tag>
        ) : (
          <Button 
            size="small" 
            onClick={() => handleMarkAlertRead(record.alertID)}
          >
            Mark Read
          </Button>
        )
      )
    }
  ];

  const appointmentColumns = [
    {
      title: 'Date & Time',
      dataIndex: 'datetime',
      key: 'datetime',
      render: (text) => (
        <div>
          <div>{new Date(text).toLocaleDateString()}</div>
          <Text type="secondary">{new Date(text).toLocaleTimeString()}</Text>
        </div>
      ),
      sorter: (a, b) => new Date(a.datetime) - new Date(b.datetime)
    },
    {
      title: 'Doctor',
      dataIndex: 'doctorName',
      key: 'doctorName',
      render: (text, record) => (
        <div>
          <div>{text}</div>
          <Text type="secondary">{record.type}</Text>
        </div>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text) => (
        <Tag 
          color={
            text === 'Completed' ? 'success' : 
            text === 'Cancelled' ? 'error' : 'processing'
          }
        >
          {text}
        </Tag>
      )
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (text) => text || '--'
    }
  ];

  const renderDashboard = () => (
    <>
      {/* Critical Alerts */}
      {alerts.some(alert => alert.severity === 'High' && !alert.isRead) && (
        <Alert
          message="Critical Alert"
          description="You have high priority alerts that require immediate attention."
          type="error"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
          action={
            <Button 
              type="primary" 
              size="small" 
              onClick={() => setActiveTab('alerts')}
            >
              View Alerts
            </Button>
          }
        />
      )}
      
      <Row gutter={[16, 16]} className="dashboard-stats">
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card" hoverable>
            <Statistic 
              title="AI Health Risk Score" 
              value={riskScore} 
              suffix="/100" 
              prefix={
                riskScore > 70 ? <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> : 
                riskScore > 40 ? <ExclamationCircleOutlined style={{ color: '#faad14' }} /> : 
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              }
            />
            <Progress 
              percent={riskScore} 
              showInfo={false} 
              strokeColor={
                riskScore > 70 ? '#ff4d4f' : 
                riskScore > 40 ? '#faad14' : '#52c41a'
              } 
            />
            <Text type="secondary">
              {riskScore > 70 ? 'High Risk - Contact your doctor' : 
               riskScore > 40 ? 'Moderate Risk - Monitor closely' : 'Low Risk - Good condition'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card" hoverable>
            <Statistic 
              title="Medications Today" 
              value={
                medications.filter(m => new Date(m.nextDose).toDateString() === new Date().toDateString()).length
              }
              prefix={<MedicineBoxOutlined />}
            />
            <Text type="secondary">
              {medications.filter(m => m.status === 'Taken').length} taken, {
                medications.filter(m => m.status !== 'Taken' && 
                  new Date(m.nextDose).toDateString() === new Date().toDateString()
                ).length
              } remaining
            </Text>
            <Button 
              type="link" 
              size="small" 
              onClick={() => setActiveTab('medications')}
              style={{ padding: 0 }}
            >
              View all medications
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="dashboard-card" hoverable>
            <Statistic 
              title="New Alerts" 
              value={unreadAlerts}
              prefix={<BellOutlined />}
            />
            <Text type="secondary">
              {alerts.filter(a => a.severity === 'High' && !a.isRead).length} critical, {
                alerts.filter(a => a.severity === 'Medium' && !a.isRead).length
              } warnings
            </Text>
            <Button 
              type="link" 
              size="small" 
              onClick={() => setActiveTab('alerts')}
              style={{ padding: 0 }}
            >
              View all alerts
            </Button>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-sections">
        <Col xs={24} md={12}>
          <Card 
            title="Current Vitals" 
            className="dashboard-section-card" 
            hoverable
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsModalVisible(true)}
                loading={loading}
              >
                Add Manual Reading
              </Button>
            }
          >
            {loading ? (
              <Spin />
            ) : vitals ? (
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={12} md={12}>
                  <Card size="small">
                    <Statistic 
                      title="Blood Pressure" 
                      value={vitals.bloodPressure || '--/--'} 
                      prefix={
                        vitals.bloodPressure ? (
                          vitals.bloodPressure.split('/')[0] > 140 || vitals.bloodPressure.split('/')[1] > 90 ? 
                            <ArrowUpOutlined style={{ color: '#ff4d4f' }} /> : 
                            vitals.bloodPressure.split('/')[0] > 130 || vitals.bloodPressure.split('/')[1] > 85 ? 
                            <ArrowUpOutlined style={{ color: '#faad14' }} /> : 
                            null
                        ) : null
                      }
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={12}>
                  <Card size="small">
                    <Statistic 
                      title="Heart Rate" 
                      value={vitals.heartRate || '--'} 
                      suffix="bpm"
                      prefix={
                        vitals.heartRate ? (
                          vitals.heartRate > 100 || vitals.heartRate < 60 ? 
                            <ArrowUpOutlined style={{ color: '#ff4d4f' }} /> : 
                            vitals.heartRate > 90 || vitals.heartRate < 65 ? 
                            <ArrowUpOutlined style={{ color: '#faad14' }} /> : 
                            null
                        ) : null
                      }
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={12}>
                  <Card size="small">
                    <Statistic 
                      title="Blood Sugar" 
                      value={vitals.bloodSugar || '--'} 
                      suffix="mg/dL"
                      prefix={
                        vitals.bloodSugar ? (
                          vitals.bloodSugar > 140 ? 
                            <ArrowUpOutlined style={{ color: '#ff4d4f' }} /> : 
                            vitals.bloodSugar > 120 ? 
                            <ArrowUpOutlined style={{ color: '#faad14' }} /> : 
                            null
                        ) : null
                      }
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={12}>
                  <Card size="small">
                    <Statistic 
                      title="Oxygen Level" 
                      value={vitals.oxygenLevel || '--'} 
                      suffix="%"
                      prefix={
                        vitals.oxygenLevel ? (
                          vitals.oxygenLevel < 92 ? 
                            <ArrowDownOutlined style={{ color: '#ff4d4f' }} /> : 
                            vitals.oxygenLevel < 95 ? 
                            <ArrowDownOutlined style={{ color: '#faad14' }} /> : 
                            null
                        ) : null
                      }
                    />
                  </Card>
                </Col>
              </Row>
            ) : (
              <Text type="secondary">No vitals data available</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card 
            title="Upcoming Appointments" 
            className="dashboard-section-card" 
            hoverable
            extra={
              <Button 
                type="primary" 
                icon={<VideoCameraOutlined />} 
                onClick={() => setIsTelemedModalVisible(true)}
              >
                Request Telemedicine
              </Button>
            }
          >
            {appointments.length > 0 ? (
              <Table 
                columns={appointmentColumns} 
                dataSource={appointments.filter(a => 
                  new Date(a.datetime) > new Date() && 
                  a.status !== 'Cancelled' && 
                  a.status !== 'Completed'
                )} 
                size="small" 
                pagination={false}
                onRow={(record) => ({
                  onClick: () => navigate(`/appointments/${record.appointmentID}`)
                })}
              />
            ) : (
              <Text type="secondary">No upcoming appointments</Text>
            )}
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col xs={24}>
          <Card title="Health Trends (Last 30 Days)" className="dashboard-section-card" hoverable>
            {healthData.length > 0 ? (
              <HealthTrendsChart data={trendsData} />
            ) : (
              <Text type="secondary">No health data available for trends</Text>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderMedications = () => (
    <Card title="Your Medications" className="dashboard-section-card" hoverable>
      <Tabs defaultActiveKey="current">
        <TabPane tab="Current Medications" key="current">
          <Table 
            columns={medicationColumns} 
            dataSource={medications.filter(m => 
              new Date(m.nextDose) >= new Date() || 
              m.status !== 'Taken'
            )} 
            size="small" 
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
        <TabPane tab="Medication History" key="history">
          <Table 
            columns={medicationColumns} 
            dataSource={medications.filter(m => 
              new Date(m.nextDose) < new Date() && 
              m.status === 'Taken'
            )} 
            size="small" 
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>
    </Card>
  );

  const renderAlerts = () => (
    <Card title="Your Health Alerts" className="dashboard-section-card" hoverable>
      <Tabs defaultActiveKey="unread">
        <TabPane 
          tab={
            <span>
              Unread Alerts
              {unreadAlerts > 0 && (
                <Badge count={unreadAlerts} style={{ marginLeft: '8px' }} />
              )}
            </span>
          } 
          key="unread"
        >
          <Table 
            columns={alertColumns} 
            dataSource={alerts.filter(a => !a.isRead)} 
            size="small" 
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
        <TabPane tab="All Alerts" key="all">
          <Table 
            columns={alertColumns} 
            dataSource={alerts} 
            size="small" 
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>
    </Card>
  );

  const renderHealthData = () => (
    <Card title="Your Health Data" className="dashboard-section-card" hoverable>
      <div style={{ marginBottom: '16px' }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setIsModalVisible(true)}
        >
          Add Manual Reading
        </Button>
      </div>
      <Table 
        columns={healthDataColumns} 
        dataSource={healthData} 
        size="small" 
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );

  const renderAppointments = () => (
    <Card title="Your Appointments" className="dashboard-section-card" hoverable>
      <div style={{ marginBottom: '16px' }}>
        <Button 
          type="primary" 
          icon={<VideoCameraOutlined />} 
          onClick={() => setIsTelemedModalVisible(true)}
        >
          Request Telemedicine
        </Button>
      </div>
      <Tabs defaultActiveKey="upcoming">
        <TabPane tab="Upcoming" key="upcoming">
          <Table 
            columns={appointmentColumns} 
            dataSource={appointments.filter(a => 
              new Date(a.datetime) > new Date() && 
              a.status !== 'Cancelled'
            )} 
            size="small" 
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
        <TabPane tab="Past Appointments" key="past">
          <Table 
            columns={appointmentColumns} 
            dataSource={appointments.filter(a => 
              new Date(a.datetime) <= new Date() || 
              a.status === 'Cancelled'
            )} 
            size="small" 
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>
    </Card>
  );

  const renderProfile = () => (
    <Card title="Your Profile" className="dashboard-section-card" hoverable>
      {profileData ? (
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
                    description={profileData.phoneNumber}
                  />
                </List.Item>
                <List.Item>
                  <List.Item.Meta
                    title="Address"
                    description={profileData.address}
                  />
                </List.Item>
              </List>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card title="Health Information">
              <Collapse defaultActiveKey={['1']}>
                <Panel header="Basic Information" key="1">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic title="Date of Birth" value={profileData.dateOfBirth} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Gender" value={profileData.gender} />
                    </Col>
                  </Row>
                </Panel>
                <Panel header="Emergency Contacts" key="2">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic 
                        title="Emergency Contact" 
                        value={profileData.emergencyContact} 
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic 
                        title="Emergency Phone" 
                        value={profileData.emergencyPhone} 
                      />
                    </Col>
                  </Row>
                </Panel>
                <Panel header="Health Stats" key="3">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic 
                        title="Last Risk Score" 
                        value={riskScore} 
                        suffix="/100" 
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="Engagement Points" 
                        value={points} 
                        prefix={<TrophyOutlined />} 
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic 
                        title="Active Alerts" 
                        value={unreadAlerts} 
                        prefix={<BellOutlined />} 
                      />
                    </Col>
                  </Row>
                </Panel>
              </Collapse>
            </Card>
          </Col>
        </Row>
      ) : (
        <Spin />
      )}
    </Card>
  );

  const renderRewards = () => (
    <RewardsProgram points={points} />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'profile':
        return renderProfile();
      case 'health':
        return renderHealthData();
      case 'medications':
        return renderMedications();
      case 'alerts':
        return renderAlerts();
      case 'appointments':
        return renderAppointments();
      case 'rewards':
        return renderRewards();
      default:
        return renderDashboard();
    }
  };

  return (
    <Layout className="patient-dashboard">
      <Sider width={250} className="dashboard-sider" breakpoint="lg" collapsedWidth="0">
        <div className="dashboard-logo">
          <Title level={4} className="dashboard-title">
            <DashboardOutlined /> Patient Portal
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
          <Menu.Item key="profile" icon={<UserOutlined />}>Profile</Menu.Item>
          <Menu.Item key="health" icon={<HeartOutlined />}>Health Data</Menu.Item>
          <Menu.Item key="medications" icon={<MedicineBoxOutlined />}>Medications</Menu.Item>
          <Menu.Item key="alerts" icon={<BellOutlined />}>
            Alerts {unreadAlerts > 0 && (
              <Badge count={unreadAlerts} style={{ marginLeft: '8px' }} />
            )}
          </Menu.Item>
          <Menu.Item key="appointments" icon={<CalendarOutlined />}>Appointments</Menu.Item>
          <Menu.Item key="rewards" icon={<TrophyOutlined />}>Rewards</Menu.Item>
        </Menu>
        
        <div className="points-display">
          <FireOutlined style={{ color: '#ff4d4f', fontSize: '24px' }} />
          <Text strong style={{ fontSize: '18px', marginLeft: '8px' }}>{points} Points</Text>
        </div>
      </Sider>
      <Layout>
        <AntHeader className="dashboard-header">
          <Header />
        </AntHeader>
        <Content className="dashboard-content">
          <div className="dashboard-container">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
              </div>
            ) : (
              renderContent()
            )}
          </div>
        </Content>
      </Layout>
      
      {/* Add Health Data Modal */}
      <Modal
        title="Add Manual Health Data"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="Submit"
        cancelText="Cancel"
      >
        <Form form={form} onFinish={handleAddHealthData} layout="vertical">
          <Form.Item 
            name="bloodPressure" 
            label="Blood Pressure" 
            rules={[{ required: true, message: 'Please input your blood pressure!' }]}
            tooltip="Format: systolic/diastolic (e.g., 120/80)"
          >
            <Input placeholder="e.g. 120/80" />
          </Form.Item>
          <Form.Item 
            name="heartRate" 
            label="Heart Rate (bpm)" 
            rules={[{ required: true, message: 'Please input your heart rate!' }]}
          >
            <Input type="number" min="30" max="200" />
          </Form.Item>
          <Form.Item 
            name="bloodSugar" 
            label="Blood Sugar (mg/dL)" 
            rules={[{ required: true, message: 'Please input your blood sugar level!' }]}
          >
            <Input type="number" min="50" max="500" />
          </Form.Item>
          <Form.Item 
            name="oxygenLevel" 
            label="Oxygen Level (%)" 
            rules={[{ required: true, message: 'Please input your oxygen level!' }]}
          >
            <Input type="number" min="70" max="100" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea placeholder="Any additional notes about your readings" />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Telemedicine Request Modal */}
      <Modal
        title="Request Telemedicine Consultation"
        visible={isTelemedModalVisible}
        onCancel={() => setIsTelemedModalVisible(false)}
        onOk={() => telemedForm.submit()}
        okText="Submit Request"
        cancelText="Cancel"
        width={700}
      >
        <Form form={telemedForm} onFinish={handleRequestTelemed} layout="vertical">
          <Form.Item 
            name="doctorId" 
            label="Select Doctor" 
            rules={[{ required: true, message: 'Please select a doctor!' }]}
          >
            <Select
              showSearch
              placeholder="Select a doctor"
              optionFilterProp="children"
              onChange={(value) => setSelectedDoctor(value)}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              loading={doctors.length === 0}
            >
              {doctors.map(doctor => (
                <Option key={doctor.id} value={doctor.id}>
                  {doctor.name} ({doctor.specialization})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item 
            name="preferredDateTime" 
            label="Preferred Date & Time" 
            rules={[{ required: true, message: 'Please select preferred date and time!' }]}
          >
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm" 
              style={{ width: '100%' }} 
              disabledDate={(current) => {
                return current && current < moment().startOf('day');
              }}
            />
          </Form.Item>
          <Form.Item 
            name="reason" 
            label="Reason for Consultation" 
            rules={[{ required: true, message: 'Please describe the reason for consultation!' }]}
          >
            <Input.TextArea rows={4} placeholder="Describe the main reason for your consultation" />
          </Form.Item>
          <Form.Item 
            name="symptoms" 
            label="Current Symptoms"
            tooltip="Please list any symptoms you're currently experiencing"
          >
            <Input.TextArea rows={4} placeholder="List any symptoms you're experiencing (e.g., chest pain, dizziness, etc.)" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default PatientDashboard;