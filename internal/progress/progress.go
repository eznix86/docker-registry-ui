package progress

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	clog "github.com/charmbracelet/log"
	"github.com/gorilla/websocket"
)

type ProgressReporter interface {
	SetTotal(total int)
	Track(message, step string) TaskReporter
	UpdateMessage(message string)
	UpdateStep(step string)
	Complete()
	Reset()
	Subscribe() <-chan Update
}

type TaskReporter interface {
	Done()
}

type Update struct {
	Completed int    `json:"completed"`
	Total     int    `json:"total"`
	Message   string `json:"message"`
	Step      string `json:"step"`
	Done      bool   `json:"done"`
}

type Tracker struct {
	total         int
	completed     int
	latestMessage string
	latestStep    string
	mu            sync.Mutex
	subscribers   []chan Update
	done          bool
}

func NewTracker() *Tracker {
	return &Tracker{}
}

func (t *Tracker) SetTotal(total int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.total = total
	t.broadcast()
}

func (t *Tracker) Track(message, step string) TaskReporter {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.latestMessage = message
	t.latestStep = step
	task := &Task{tracker: t}
	t.broadcast()
	return task
}

func (t *Tracker) UpdateMessage(message string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.latestMessage = message
	t.broadcast()
}

func (t *Tracker) UpdateStep(step string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.latestStep = step
	t.broadcast()
}

func (t *Tracker) Complete() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.done = true
	t.broadcast()
}

func (t *Tracker) Reset() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.total = 0
	t.completed = 0
	t.latestMessage = ""
	t.latestStep = ""
	t.done = false
	t.broadcast()
}

func (t *Tracker) Subscribe() <-chan Update {
	t.mu.Lock()
	defer t.mu.Unlock()
	ch := make(chan Update, 10)
	t.subscribers = append(t.subscribers, ch)
	ch <- t.currentUpdate()
	return ch
}

func (t *Tracker) broadcast() {
	u := t.currentUpdate()
	for _, ch := range t.subscribers {
		select {
		case ch <- u:
		default:
		}
	}
}

func (t *Tracker) currentUpdate() Update {
	return Update{
		Completed: t.completed,
		Total:     t.total,
		Message:   t.latestMessage,
		Step:      t.latestStep,
		Done:      t.done,
	}
}

type Task struct {
	tracker *Tracker
}

func (tk *Task) Done() {
	tk.tracker.mu.Lock()
	defer tk.tracker.mu.Unlock()
	tk.tracker.completed++
	tk.tracker.broadcast()
}

// Silent progress reporter for non-interactive use.
type silentReporter struct{}

func NewSilent() ProgressReporter { return &silentReporter{} }

func (s *silentReporter) SetTotal(_ int)                    {}
func (s *silentReporter) Track(_, _ string) TaskReporter    { return &silentTask{} }
func (s *silentReporter) UpdateMessage(_ string)            {}
func (s *silentReporter) UpdateStep(_ string)               {}
func (s *silentReporter) Complete()                         {}
func (s *silentReporter) Reset()                            {}
func (s *silentReporter) Subscribe() <-chan Update          { ch := make(chan Update, 1); close(ch); return ch }

type silentTask struct{}

func (st *silentTask) Done() {}

// CLI renderer.
func RenderCLI(tracker *Tracker) {
	updates := tracker.Subscribe()
	startTime := time.Now()
	for update := range updates {
		if update.Done {
			fmt.Print("\n")
			return
		}
		if update.Total == 0 {
			continue
		}
		pct := float64(update.Completed) / float64(update.Total) * 100
		elapsed := time.Since(startTime)
		var eta string
		if update.Completed > 0 {
			avg := elapsed / time.Duration(update.Completed)
			remaining := time.Duration(update.Total-update.Completed) * avg
			eta = fmt.Sprintf(" | ETA: %v", remaining.Round(time.Second))
		}
		fmt.Printf("\r\033[K[%d/%d] %.1f%% - %s [%s]%s",
			update.Completed, update.Total, pct, update.Message, update.Step, eta)
	}
}

// WebSocketBroadcaster manages connected clients and broadcasts messages.
type WebSocketBroadcaster struct {
	clients    map[*websocket.Conn]bool
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	messages   chan []byte
	mu         sync.RWMutex
}

func NewWebSocketBroadcaster() *WebSocketBroadcaster {
	return &WebSocketBroadcaster{
		clients:    make(map[*websocket.Conn]bool),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		messages:   make(chan []byte, 256),
	}
}

func (b *WebSocketBroadcaster) Run() {
	for {
		select {
		case client := <-b.register:
			b.mu.Lock()
			b.clients[client] = true
			b.mu.Unlock()
		case client := <-b.unregister:
			b.mu.Lock()
			if _, ok := b.clients[client]; ok {
				delete(b.clients, client)
				_ = client.Close()
			}
			b.mu.Unlock()
		case msg := <-b.messages:
			b.broadcastMsg(msg)
		}
	}
}

func (b *WebSocketBroadcaster) broadcastMsg(msg []byte) {
	b.mu.RLock()
	clients := make([]*websocket.Conn, 0, len(b.clients))
	for c := range b.clients {
		clients = append(clients, c)
	}
	b.mu.RUnlock()

	for _, c := range clients {
		if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
			b.mu.Lock()
			delete(b.clients, c)
			b.mu.Unlock()
		}
	}
}

func (b *WebSocketBroadcaster) Send(msg []byte) {
	b.messages <- msg
}

func (b *WebSocketBroadcaster) Add(conn *websocket.Conn) {
	b.register <- conn
}

func (b *WebSocketBroadcaster) Remove(conn *websocket.Conn) {
	b.unregister <- conn
}

// RenderWebSocket subscribes to tracker updates and sends them as JSON to a broadcaster.
func RenderWebSocket(tracker *Tracker, send func([]byte)) {
	updates := tracker.Subscribe()
	for update := range updates {
		jsonData, err := marshalUpdate(update)
		if err != nil {
			clog.Error("Failed to marshal progress update", "error", err)
			continue
		}
		send(jsonData)
	}
}

func marshalUpdate(u Update) ([]byte, error) {
	return json.Marshal(u)
}
